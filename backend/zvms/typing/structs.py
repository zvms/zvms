from zvms.typing.checker import *
from zvms.res import VolType, VolStatus, ThoughtStatus

class Class(Object):
    name = Len(String, 1, 6)

class SingleClass(Object):
    id = Int
    name = String

class SingleUserWithoutAuth(Object):
    id = Int
    name = String

class SingleUser(SingleUserWithoutAuth):
    auth = Int

ListClassesResponse = Array(SingleClass())
    
class ClassInfoResponse(Object):
    name = String
    students=Array(SingleUser())
    teachers=Array(SingleUser())

class UserLoginResponse(Object):
    token = String

SearchUsersResponse = Array(SingleUser())

class UserInfoResponse:
    name = String
    cls = Int
    auth = Int
    clsName = String

class ThoughtInfoResponse(Object):
    reason = String
    thought = String
    reward = Int
    pics = Array(String)

class StudentThoughtsResponse(Object):
    accepted = Array(ThoughtInfoResponse())
    unsubmitted = Array(ThoughtInfoResponse())
    draft = Array(ThoughtInfoResponse())
    unaudited = Array(ThoughtInfoResponse())

class StudentStatResponse(Object):
    inside = Int
    outside = Int
    large = Int

class SingleNotice(Object):
    id = Int
    title = String
    content = String
    sender = Int
    deadtime = DateTime
    senderName = String
    
SearchNoticesResponse = Array(SingleNotice())

class SingleSignup(Object):
    volId = Int
    volName = String
    stuId = Int
    stuName = String
    
ListSignupResponse = Array(SingleSignup())

class SingleVolunteer(Object):
    id = Int
    name = String
    time = String
    status = Int
    
SearchVolunteersResponse = Array(SingleVolunteer())

class VolunteerInfoResponse(Object):
    name = String
    description = String
    time = String
    status = Enum(VolStatus)
    type = Enum(VolType)
    reward = Int
    signable = Boolean
    joiners = Array(SingleUserWithoutAuth())
    holder = Int
    holderName = String

class SearchNotices(Optional):
    sender = Int
    user = Int
    cls = Int
    school = Int

class NoticeBody(Object):
    title = Len(String, 1, 33)
    content = Len(String, 1, 1025)
    deadtime = DateTime
    
class Notice(NoticeBody):
    targets = Array(Int)

class Report(Object):
    report = String
    
class Signup(Object):
    students = Array(Int)
    
class SearchThoughts(Optional):
    cls = Int
    status = Enum(ThoughtStatus)
    student = Int
    volunteer = Int
    
class Thought(Object):
    thought = Len(String, 1, 1025)
    pictures = Array(String)

class Login(Object):
    id = Int
    pwd = Len(String, 32, 33)

class SearchUsers(Optional):
    name = String
    cls = Int
    auth = Int
    
class ModPwd(Object):
    old = Len(String, 32, 33)
    neo = Len(String, 32, 33)

class User(Object):
    name = Len(String, 1, 6)
    cls = Int
    auth = Int

class OneUser(User):
    id = Int

class Users(Object):
    users = Array(OneUser())

class ClassVol(Object):
    id = Int
    max = Int
    
class SearchVolunteers(Optional):
    holder = Int
    student = Int
    cls = Int
    name = String
    status = Enum(VolStatus)
    
class Volunteer(Object):
    name = Len(String, 1, 33)
    description = Len(String, 1, 1025)
    time = DateTime
    type = Enum(VolType)
    reward = Int
    classes = Array(ClassVol())

class Repulse(Object):
    reason = Len(String, 1, 65)