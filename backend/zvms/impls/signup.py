from zvms.models import *
from zvms.res import *
from zvms.util import *


def list_signup(**kwargs):
    '[GET] /signup'
    if 'c' not in kwargs:
        return error(400, '请求接口错误: 没有指定班级')
    return success('获取成功', list_or_error(StuVol.query.select(stu_id='stuId', vol_id='volId', stu_name='stuName', vol_name='volName')))


def audit_signup(stuId, volId, token_data):
    '[PATCH] /signup/<int:stuId>/<int:volId>'
    stu_vol = StuVol.query.get((stuId, volId))
    if not stu_vol:
        return error(406, '学生未报名该义工')
    auth_cls(User.query.get(stuId).cls_id, token_data)
    stu_vol.status = Status.UNSUBMITTED
    return success('审核成功')


def signup(stuId, volId, token_data):
    '[POST] /signup/<int:stuId>'
    if Volunteer.query.get_or_error(volId, '该义工不存在').time < datetime.datetime.now():
        return error(406, '该义工报名已截至')
    if StuVol.query.get((stuId, volId)):
        return error(406, '学生已报名该义工')
    stu = User.query.get_or_error(stuId, '该学生不存在')
    cv = ClassVol.query.get_or_error((stu.cls_id, volId), '该班级不能报名')
    if cv.now >= cv.max:
        return error(406, '名额已满')
    if stu.auth & Categ.TEACHER:
        return error(406, '不能报名教师')
    if (Categ.TEACHER | Categ.CLASS).authorized(token_data['auth']):
        auth_cls(User.query.get(stuId).cls_id, token_data, '不能报名其他班级')
        StuVol(
            stu_id=stuId,
            vol_id=volId,
            status=Status.UNSUBMITTED,
        ).insert()
    else:
        auth_self(stuId, token_data, '不能给其他人报名')
        StuVol(
            stu_id=stuId,
            vol_id=volId,
            status=Status.WAITING_FOR_FIRST_AUDIT
        ).insert()
    return success('报名成功')


def rollback(stuId, volId, token_data):
    '[DELETE] /signup/<int:stuId>/<int:volId>'
    StuVol.query.get_or_error((stuId, volId), '未报名该义工')
    if (Categ.TEACHER | Categ.CLASS).authorized(token_data['auth']):
        auth_cls(User.query.get(stuId).cls_id, token_data, '不能修改其他班级')
    else:
        auth_self(stuId, token_data, '不能撤回其他人的报名')
    StuVol.query.filter_by(stu_id=stuId, vol_id=volId).delete()
    return success('撤回成功')
