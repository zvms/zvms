export enum VolType {
    Inside = 1,
    Outside = 2,
    Large = 3
}

export function getVolTypeName(id: VolType): string {
    switch (id) {
        case VolType.Inside:
            return "校内义工";
        case VolType.Outside:
            return "校外义工";
        case VolType.Large:
            return "大型实践";
        default:
            throw Error("Invalid enum value");
    }
}

export enum VolStatus {
    Unaudited = 1,
    Audited = 2
}

export function getVolStatusName(id: VolStatus): string {
    switch (id) {
        case VolStatus.Unaudited:
            return "未过审";
        case VolStatus.Audited:
            return "已过审";
        default:
            throw Error("Invalid enum value");
    }
}

export enum ThoughtStatus {
    WaitingForSignupAudit = 1,
    Unsubmitted = 2,
    Draft = 3,
    WaitingForFirstAudit = 4,
    WaitingForFinalAudit = 5,
    Accepted = 6
}

export function getThoughtStatusName(id: ThoughtStatus): string {
    switch (id) {
        case ThoughtStatus.WaitingForSignupAudit:
            return "等待报名审核";
        case ThoughtStatus.Unsubmitted:
            return "未填写";
        case ThoughtStatus.Draft:
            return "草稿";
        case ThoughtStatus.WaitingForFirstAudit:
            return "等待初审";
        case ThoughtStatus.WaitingForFinalAudit:
            return "等待终审";
        case ThoughtStatus.Accepted:
            return "已通过";
        default:
            throw Error("Invalid enum value");
    }
}

export enum NoticeType {
    UserNotice = 1,
    ClassNotice = 2,
    SchoolNotice = 3
}

export function getNoticeTypeName(id: NoticeType): string {
    switch (id) {
        case NoticeType.UserNotice:
            return "用户通知";
        case NoticeType.ClassNotice:
            return "班级通知";
        case NoticeType.SchoolNotice:
            return "学校通知";
        default:
            throw Error("Invalid enum value");
    }
}

export enum Categ {
    None = 1,
    Student = 2,
    Teacher = 4,
    Class = 8,
    Manager = 16,
    Auditor = 32,
    System = 64,
    Any = 127
}

export function getCategName(id: Categ): string {
    switch (id) {
        case Categ.None:
            return "未登录";
        case Categ.Student:
            return "学生";
        case Categ.Teacher:
            return "教师";
        case Categ.Class:
            return "班级";
        case Categ.Manager:
            return "管理员";
        case Categ.Auditor:
            return "审计部";
        case Categ.System:
            return "系统";
        case Categ.Any:
            return "任意";
        default:
            throw Error("Invalid enum value");
    }
}

