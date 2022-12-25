from flask import request
from functools import wraps
from jwt.exceptions import InvalidSignatureError
import datetime
import json

from zvms import app, db
from zvms.res import *
from zvms.util import *
import zvms.tokenlib as tk


def route(*,rule, method='GET', impl_func, params=Any, auth=AUTH.ALL):
    app.add_url_rule(rule, methods=[method], view_func=deco(impl_func, params, auth))

# 不要听下面的注释, 现在已经没有装饰器了
# 以后把调试的代码写在这边，把一些公用的功能也可以移到这边
# 在所有函数名前面加上@Deco()
# 这样路由的函数直接返回一个字典就好了
def deco(impl, params, auth):
    @wraps(impl)
    def wrapper(*args,**kwargs):
        if request.method == 'GET':
            json_data = request.args
        else:
            try: # 为了防止空POST出锅
                json_data = json.loads(request.get_data().decode("utf-8"))
            except:
                json_data = {}
        token_data = {}
        if auth != None:
            try:
                token_data = request.headers.get('Authorization')
                if not token_data:
                    raise InvalidSignatureError()
                token_data = tk.read(token_data)
                if not tk.exists(token_data):
                    return json.dumps({'type':'ERROR', 'message':"Token失效, 请重新登陆"})
                if not auth.authorized(token_data['auth']):
                    return json.dumps({'type': 'ERROR', 'message': '权限不足'})
            except InvalidSignatureError as ex:
                return json.dumps({'type':'ERROR', 'message':"未获取到Token, 请重新登陆"})
        if not params(json_data):
            return interface_error(params, json_data)
        try:
            with open('log.txt', 'a', encoding='utf-8') as f:
                if auth:
                    f.write(f'({token_data["id"]}) ')
                f.write(f'[{datetime.datetime.now()}] {request.method} {request.url}\n')
            return impl(*args, **kwargs, **json_data, token_data=token_data)
        except ZvmsError as ex:
            return error(ex.message)
    return wrapper