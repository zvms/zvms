import datetime

from zvms.models import *
from zvms.res import *
from zvms.util import *
from zvms.apilib import Api


def get_signable(id, time, token_data):
    cv = ClassVol.query.get_or_error((id, token_data['cls']))
    return time <= datetime.datetime.now() and cv is not None and cv.now < cv.max

@Api(rule='/volunteer/search', params='SearchVolunteers', response='SearchVolunteersResponse')
def search_volunteers(token_data, **kwargs):
    '''搜索义工'''
    conds = []
    try:
        if 'holder' in kwargs:
            conds.append(Volunteer.holder_id == int(kwargs['holder']))
        if 'student' in kwargs:
            conds.append(Volunteer.id.in_(StuVol.query.filter_by(
                stu_id=int(kwargs['student'])).select_value('notice_id')))
        if 'cls' in kwargs:
            conds.append(Volunteer.id.in_(ClassVol.query.filter_by(
                cls_id=int(kwargs['cls'])).select_value('notice_id')))
        if 'name' in kwargs:
            conds.append(Volunteer.name.like(f'%{kwargs["name"]}%'))
        if 'status' in kwargs:
            conds.append(Volunteer.status == int(kwargs['status']))
    except ValueError:
        return error('请求接口错误: 非法的URL参数')

    def process_query(query):
        ret = list_or_error(query.select('id', 'name', 'status', 'time'))
        for i in ret:
            i['signable'] = get_signable(i['id'], i['time'], token_data)
            i['time'] = str(i['time'])
        return success('获取成功', ret)
    return process_query(Volunteer.query.filter(*conds))


@Api(rule='/volunteer/<int:id>', response='VolunteerInfoResponse')
def get_volunteer_info(id, token_data):
    '''获取一个义工的详细信息'''
    ret = Volunteer.query.get_or_error(id).select(
        'name',
        'type',
        'reward',
        'joiners',
        'time',
        'status',
        description=render_markdown,
        holder=rpartial(getattr, 'id'),
        holderName=('holder', rpartial(getattr, 'name'))
    )
    ret['signable'] = get_signable(id, ret['time'], token_data)
    ret['time'] = str(ret['time'])
    return success('获取成功', **ret)


def _create_volunteer(token_data, kwargs):
    if token_data['auth'] == Categ.STUDENT and kwargs['type'] == VolType.OUTSIDE:
        raise ZvmsError('权限不足: 只能创建校外义工')
    return Volunteer(
        **kwargs,
        holder_id=token_data['id'],
        status=VolStatus.UNAUDITED if token_data['auth'] == Categ.STUDENT else VolStatus.AUDITED
    ).insert().id


@Api(rule='/volunteer/create', method='POST', params='Volunteer')
def create_volunteer(token_data, classes, **kwargs):
    '''创建一个义工'''
    id = _create_volunteer(token_data, kwargs)
    if (Categ.CLASS | Categ.TEACHER).authorized(token_data['auth']):
        for cls in classes:
            cls_ = Class.query.get_or_error(cls['id'], '班级不存在')
            if cls['max'] > cls_.members.count():
                return error('义工永远无法报满')
            ClassVol(
                cls_id=cls['id'],
                vol_id=id,
                max=cls['max']
            ).insert()
    else:
        for cls in classes:
            if cls['id'] != token_data['cls']:
                return error('不能创建其他班级的义工')
            if cls['max'] > Class.query.get(cls['id']).members.count():
                return error('义工永远无法报满')
            ClassVol(
                cls_id=cls['id'],
                vol_id=id,
                max=cls['max']
            ).insert()
    return success('创建成功')


@Api(rule='/volunteer/create/appointed', method='POST', params='AppointedVolunteer')
def create_appointed_volunteer(token_data, joiners, **kwargs):
    '''创建一个成员全部指定的义工'''
    id = _create_volunteer(token_data, kwargs)
    for joiner in joiners:
        user = User.query.get(joiner)
        if user is None:
            return error(f'学生{joiner}不存在')
        if user.auth & Categ.TEACHER:
            return error(f'不可报名教师{joiner}')
        StuVol(
            stu_id=joiner['id'],
            vol_id=id
        ).insert()
    return success('创建成功')


@Api(rule='/volunteer/<int:id>/modify', method='POST', params='Volunteer')
def modify_volunteer(token_data, id, classes, **kwargs):
    '''修改义工'''
    vol = Volunteer.query.get_or_error(id)
    auth_self(vol.holder_id, token_data, '权限不足: 不能修改其他人的义工')
    for cls in classes:
        cls_ = Class.query.get_or_error(cls['id'], '班级不存在')
        if cls['max'] > cls_.members.count():
            return error('义工永远无法报满')
        cv = ClassVol.query.get((cls['id'], id))
        if cv:
            ClassVol(
                cls_id=cls['id'],
                vol_id=id,
                max=cls['max']
            ).insert()
        else:
            cv.max = cls['max']
        if cv.now > cls['max']:
            return error('义工报名溢出')
    vol.update(**kwargs)
    return success('修改成功')


@Api(rule='/volunteer/<int:id>/delete', method='POST')
def delete_volunteer(token_data, id):
    '''删除义工'''
    auth_self(Volunteer.query.get_or_error(id).holder_id, token_data, '权限不足: 不能删除其他人的义工')
    Volunteer.query.filter_by(id=id).delete()
    return success('删除成功')


@Api(rule='/volunteer/<int:id>/audit', method='POST', auth=Categ.CLASS | Categ.TEACHER)
def audit_volunteer(token_data, id):
    '''审核义工(班内)'''
    vol = Volunteer.query.get_or_error(id)
    if (Categ.TEACHER | Categ.CLASS) & token_data['auth']:
        auth_cls(vol.holder.cls_id, token_data)
    Volunteer.query.get_or_error(id).update(
        status=VolStatus.AUDITED
    )
    return success('审核成功')