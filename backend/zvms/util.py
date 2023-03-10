from functools import wraps, partial
from types import NoneType
from typing import Iterable
from itertools import chain
import hashlib
import datetime
import json
import re

from sqlalchemy import Column
from sqlalchemy.orm import Query as _Query
from mistune import Markdown, HTMLRenderer

from zvms.res import *

markdown = Markdown(HTMLRenderer())
rule_remove_links = re.compile(r'<a.*?>(.*?)</a>', re.S)

db = None

def init_util(_db):
    global db
    db = _db

def select_value(self, col=None, **kwargs):
    return [v(getattr(self, k)) for k, v in kwargs.items()][0] if col is None else (getattr(i, col) for i in self)

def render_markdown(md):
    return rule_remove_links.sub(r'<a>\1</a>', markdown.parse(md))

def md5ify(str):
    md5 = hashlib.md5()
    md5.update(str.encode())
    return md5.hexdigest()
        
class rpartial:
    def __init__(self, func, *args, **kwargs):
        self.func = func
        self.args = args
        self.kwargs = kwargs

    def __call__(self, *args, **kwargs):
        return self.func(*args, *self.args, **kwargs, **self.kwargs)

def foo(func):
    @wraps(func)
    def wrapper(self, *args, **kwargs):
        if isinstance(self, Iterable):
            return map(rpartial(func, *args, **kwargs), self)
        return func(self, *args, **kwargs)
    return wrapper

def bar(func):
    @wraps(func)
    def wrapper(self, *args, **kwargs):
        if isinstance(self, Iterable):
            foreach(rpartial(func, *args, **kwargs), self)
        return func(self, *args, **kwargs)
    return wrapper

def foreach(func, iterable):
    ret = None
    for item in iterable:
        ret = func(item)
    return ret

@foo
def select(self, *cols, **aliases):
    return dict(chain(zip(cols, map(partial(getattr, self), cols)),
        ((k, getattr(self, v)) if isinstance(v, str) else
        (k, v[1](getattr(self, v[0]))) if isinstance(v, tuple) else
        (k, v(getattr(self, k))) for k, v in aliases.items())))

@bar
def update(self, /, on=True, **updates):
    self.query_self().raw.update({getattr(type(self), k): v for k, v in updates.items()})
    if on:
        self.on_update()
    return self


def insert(self, on=True):
    db.session.add(self)
    db.session.flush()
    if on:
        self.on_insert()
    return self


def list_or_error(self, message='????????????????????????'):
    ret = list(self)
    # ?????????????????????????????????404?????????????????????
    # if not ret:
    #     raise ZvmsError(message)
    return ret

class Wrapper:
    def __init__(self, raw):
        self.raw = raw

    def __getattr__(self, name):
        ret = getattr(self.raw, name)
        if isinstance(ret, type(self).T):
            return type(self)(ret)
        return self.__deco(ret)

    def __iter__(self):
        return iter(self.raw)

    def __deco(self, func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            ret = func(*args, **kwargs)
            if isinstance(ret, type(self).T):
                return type(self)(ret)
            return ret
        return wrapper

class ZvmsWrapper(Wrapper):
    select = select
    update = update
    select_value = select_value

class _QueryProperty:
    def __get__(self, obj, cls):
        return Query(db.session().query(cls))

class Query(ZvmsWrapper):
    T = _Query

    def get_or_error(self, ident, message='????????????????????????'):
        ret = self.raw.get(ident)
        if not ret:
            raise ZvmsError(message)
        return ret

    def first_or_error(self, message='????????????????????????'):
        ret = self.raw.first()
        if not ret:
            raise ZvmsError(message)
        return ret

    def one_or_error(self, message='????????????????????????'):
        ret = self.raw.one()
        if not ret:
            raise ZvmsError(message)
        return ret

    def delete(self, on=True):
        for i in self:
            i.on_delete()
        self.raw.delete()


class ModelMixIn:
    select = select
    update = update
    insert = insert

    def query_self(self):
        return db.session.query.filter_by(**{k: v.__get__(self, type(self)) for k, v in self.__dict__.items() if isinstance(v, Column)})

    def delete(self, on=True):
        self.query_self().raw.delete()
        if on:
            self.on_delete()
        return self

    def on_insert(self):
        pass

    def on_update(self):
        pass

    def on_delete(self):
        pass

    query = _QueryProperty()

class filter(filter):
    select = select
    update = update
    select_value = select_value

class map(map):
    select = select
    update = update
    select_value = select_value

class chain:
    select = select
    update = update
    select_value = select_value

    def __init__(self, *iterables):
        self.iterables = iterables

    def __iter__(self):
        for iterable in self.iterables:
            yield from iterable


def error(message):
    db.session.rollback()
    return {'type': 'ERROR', 'message': message}


def success(message, *result, **kwresult):
    ret = {'type': 'SUCCESS', 'message': message}
    if result:
        ret['result'] = result[0]
    elif kwresult:
        ret['result'] = kwresult
    db.session.commit()
    return ret


class ZvmsError(Exception):
    def __init__(self, message):
        self.message = message


def auth_self(id, token_data, message):
    if id != token_data['id'] and not (token_data['auth'] & Categ.SYSTEM):
        raise ZvmsError(message)


def auth_cls(cls, token_data, message='????????????: ????????????????????????'):
    if cls != token_data['cls'] and not (token_data['auth'] & Categ.SYSTEM):
        raise ZvmsError(message)


def count(seq, predicate):
    ret = 0
    for i in seq:
        if predicate(i):
            ret += 1
    return ret


def exists(seq, predicate):
    for i in seq:
        if predicate(i):
            return True
    return False

def parse(json):
    if isinstance(json, bool):
        return 'boolean'
    if isinstance(json, int):
        return 'int'
    if isinstance(json, float):
        return 'float'
    if isinstance(json, NoneType):
        return 'null'
    if isinstance(json, str):
        return f'string({len(json)})'
    if isinstance(json, (list, tuple)):
        return list(map(parse, json))
    if isinstance(json, dict):
        return {k: parse(v) for k, v in json.items()}


def interface_error(expected, found):
    return json.dumps({'type': 'ERROR', 'message': '??????????????????', 'expected': expected.as_json(), 'found': parse(found)})