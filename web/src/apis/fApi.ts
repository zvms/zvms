import { toasts } from "@/utils/dialogs";
import { useLoadingStore } from "@/stores";
import { type AxiosResponse } from "axios";
import axios from "@/plugins/axios";
import * as structs from "./types/structs";
import * as enums from "./types/enums";

interface ForegroundApiConfig {
  beforeReq(info: ReqInfo): void;
  errorReq(e: Error, info: ReqInfo): void;

  successedRes(res: AxiosResponse<any>, info: ReqInfo): void;
  failedRes(res: AxiosResponse<any> | undefined, info: ReqInfo): void;

  afterProcess(info: ReqInfo): void;
  errorProcess(e: Error, info: ReqInfo): void;

  cleanup(info: ReqInfo): void;

  defaultFailedToast: boolean;
  defaultOkToast: boolean;
}

interface ReqInfo {
  url: string;
  method: MethodType;
  id: number;
}

let _reqId = 0;

export type MethodType = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type ForegroundApiProcessor<R extends any> = (
  result: R
) => Promise<void> | void;
export type ForegroundApiRunner<R extends any> = (
  processor?: ForegroundApiProcessor<R>
) => Promise<void>;
export function createForegroundApiRunner<T extends any[], R extends any>(
  fApi: ForegroundApi,
  method: MethodType,
  url: string,
  ...args: T
): ForegroundApiRunner<R> {
  const config = fApi.config;

  const info = {
    url,
    method,
    id: _reqId++,
  };

  const methods = {
    POST: axios.post,
    GET: axios.get,
    DELETE: axios.delete,
    PUT: axios.put,
    PATCH: axios.patch,
  } as const;

  const func = methods[method];
  if (!func) {
    config.errorReq(new Error(`Method ${method} is not supported`), info);
  }

  return async (processor: ForegroundApiProcessor<R> = () => {}) => {
    config.beforeReq(info);
    try {
      let res;
      try {
        res = await func(url, ...args); //axios
      } catch (e) {
        if (config.defaultFailedToast) {
          toasts.error((e as Error).message);
        }
        config.errorReq(e as Error, info);
        throw e;
      }

      if (res?.data?.type !== "SUCCESS") {
        config.failedRes(res, info);
        if (config.defaultFailedToast) {
          toasts.error(res?.data?.message);
        }
      } else {
        const { message, result } = res?.data;
        config.successedRes(res, info);
        try {
          await processor(result);
          if (config.defaultOkToast) {
            toasts.success(message);
          }
          config.afterProcess(info);
        } catch (e) {
          config.errorProcess(e as Error, info);
        }
        config.afterProcess(info);
      }
    } finally {
      config.cleanup(info);
    }
  };
}

export class ForegroundApi {
  config: ForegroundApiConfig;

  constructor(config: ForegroundApiConfig) {
    this.config = config;
  }

  get skipOkToast(): ForegroundApi {
    return new ForegroundApi({
      ...this.config,
      defaultOkToast: false,
    });
  }

  get loadingState(): ForegroundApi {
    const oldConfig: ForegroundApiConfig = this.config;
    return new ForegroundApi({
      ...oldConfig,
      beforeReq(info) {
        oldConfig.beforeReq(info);
        useLoadingStore().incLoading();
      },
      cleanup(info) {
        oldConfig.cleanup(info);
        useLoadingStore().decLoading();
      },
    });
  }

  //--METHODS START----
  /**
   * ## ??????????????????
   * ### [GET] /user/check
   * #### ??????: Any
   */
  check(): ForegroundApiRunner<{}> {
    return createForegroundApiRunner(this, "GET", `/user/check`);
  }
  /**
   * ## ??????
   * ### [POST] /user/login
   * #### ??????: None
   * @param id
   * @param pwd
   */
  login(
    id: number,
    pwd: string
  ): ForegroundApiRunner<structs.UserLoginResponse> {
    return createForegroundApiRunner(
      this,
      "POST",
      `/user/login`,
      id,
      pwd
    );
  }
  /**
   * ## ??????
   * ### [POST] /user/logout
   * #### ??????: Any
   */
  logout(): ForegroundApiRunner<{}> {
    return createForegroundApiRunner(this, "POST", `/user/logout`);
  }
  /**
   * ## ????????????
   * ### [GET] /user/search
   * #### ??????: Any
   * @param kwargs
   */
  searchUsers(
    kwargs: structs.SearchUsers
  ): ForegroundApiRunner<{}> {
    return createForegroundApiRunner(
      this,
      "GET",
      `/user/search`,
      kwargs
    );
  }
  /**
   * ## ???????????????????????????????????????
   * ### [GET] /user/<int:id>
   * #### ??????: Any
   * @param id
   */
  getUserInfo(
    id: number
  ): ForegroundApiRunner<structs.UserInfoResponse> {
    return createForegroundApiRunner(
      this,
      "GET",
      `/user/${id}`
    );
  }
  /**
   * ## ??????????????????(??????)????????????
   * ### [GET] /user/<int:id>/time
   * #### ??????: Any
   * @param id
   */
  getStudentStat(
    id: number
  ): ForegroundApiRunner<structs.StudentStatResponse> {
    return createForegroundApiRunner(
      this,
      "GET",
      `/user/${id}/time`
    );
  }
  /**
   * ## ?????????????????????
   * ### [POST] /user/mod-pwd
   * #### ??????: Any
   * @param old
   * @param neo
   */
  modifyPassword(
    old: string,
    neo: string
  ): ForegroundApiRunner<{}> {
    return createForegroundApiRunner(
      this,
      "POST",
      `/user/mod-pwd`,
      old,
      neo
    );
  }
  /**
   * ## ????????????
   * ### [POST] /user/create
   * #### ??????: System
   * @param users
   */
  createUser(
    users: Array<structs.OneUser>
  ): ForegroundApiRunner<{}> {
    return createForegroundApiRunner(
      this,
      "POST",
      `/user/create`,
      users
    );
  }
  /**
   * ## ??????????????????
   * ### [POST] /user/<int:id>/modify
   * #### ??????: System
   * @param id
   * @param name
   * @param cls
   * @param auth
   */
  modifyUser(
    id: number,
    name: string,
    cls: number,
    auth: number
  ): ForegroundApiRunner<{}> {
    return createForegroundApiRunner(
      this,
      "POST",
      `/user/${id}/modify`,
      name,
      cls,
      auth
    );
  }
  /**
   * ## ????????????
   * ### [POST] /user/<int:id>/delete
   * #### ??????: System
   * @param id
   */
  deleteUser(
    id: number
  ): ForegroundApiRunner<{}> {
    return createForegroundApiRunner(
      this,
      "POST",
      `/user/${id}/delete`
    );
  }
  /**
   * ## ????????????
   * ### [POST] /report
   * #### ??????: Any
   * @param report
   */
  report(
    report: string
  ): ForegroundApiRunner<{}> {
    return createForegroundApiRunner(
      this,
      "POST",
      `/report`,
      report
    );
  }
  /**
   * ## ????????????
   * ### [GET] /notice/search
   * #### ??????: Any
   * @param kwargs
   */
  searchNotices(
    kwargs: structs.SearchNotices
  ): ForegroundApiRunner<Array<structs.SingleNotice>> {
    return createForegroundApiRunner(
      this,
      "GET",
      `/notice/search`,
      kwargs
    );
  }
  /**
   * ## ??????????????????
   * ### [POST] /notice/send/user
   * #### ??????: Manager | Teacher
   * @param targets
   * @param title
   * @param content
   * @param deadtime
   */
  sendUserNotice(
    targets: Array<number>,
    title: string,
    content: string,
    deadtime: string
  ): ForegroundApiRunner<{}> {
    return createForegroundApiRunner(
      this,
      "POST",
      `/notice/send/user`,
      targets,
      title,
      content,
      deadtime
    );
  }
  /**
   * ## ??????????????????
   * ### [POST] /notice/send/class
   * #### ??????: Manager | Teacher
   * @param targets
   * @param title
   * @param content
   * @param deadtime
   */
  sendClassNotice(
    targets: Array<number>,
    title: string,
    content: string,
    deadtime: string
  ): ForegroundApiRunner<{}> {
    return createForegroundApiRunner(
      this,
      "POST",
      `/notice/send/class`,
      targets,
      title,
      content,
      deadtime
    );
  }
  /**
   * ## ??????????????????
   * ### [POST] /notice/send/school
   * #### ??????: Manager | Teacher
   * @param title
   * @param content
   * @param deadtime
   */
  sendSchoolNotice(
    title: string,
    content: string,
    deadtime: string
  ): ForegroundApiRunner<{}> {
    return createForegroundApiRunner(
      this,
      "POST",
      `/notice/send/school`,
      title,
      content,
      deadtime
    );
  }
  /**
   * ## ??????????????????
   * ### [POST] /notice/<int:id>/delete
   * #### ??????: Manager | Teacher
   * @param id
   */
  deleteNotice(
    id: number
  ): ForegroundApiRunner<{}> {
    return createForegroundApiRunner(
      this,
      "POST",
      `/notice/${id}/delete`
    );
  }
  /**
   * ## ??????????????????
   * ### [POST] /notice/<int:id>/modify
   * #### ??????: Manager | Teacher
   * @param id
   * @param title
   * @param content
   * @param deadtime
   */
  modifyNotice(
    id: number,
    title: string,
    content: string,
    deadtime: string
  ): ForegroundApiRunner<{}> {
    return createForegroundApiRunner(
      this,
      "POST",
      `/notice/${id}/modify`,
      title,
      content,
      deadtime
    );
  }
  /**
   * ## ???????????????????????????
   * ### [GET] /signup/list/<int:cls>
   * #### ??????: Any
   * @param cls
   */
  listSignup(
    cls: number
  ): ForegroundApiRunner<Array<structs.SingleSignup>> {
    return createForegroundApiRunner(
      this,
      "GET",
      `/signup/list/${cls}`
    );
  }
  /**
   * ## ??????????????????
   * ### [POST] /signup/<int:volId>/<int:stuId>/audit
   * #### ??????: Class | Teacher
   * @param volId
   * @param stuId
   */
  auditSignup(
    volId: number,
    stuId: number
  ): ForegroundApiRunner<{}> {
    return createForegroundApiRunner(
      this,
      "POST",
      `/signup/${volId}/${stuId}/audit`
    );
  }
  /**
   * ## ??????????????????
   * ### [POST] /signup/<int:volId>
   * #### ??????: Any
   * @param volId
   * @param students
   */
  signup(
    volId: number,
    students: Array<number>
  ): ForegroundApiRunner<{}> {
    return createForegroundApiRunner(
      this,
      "POST",
      `/signup/${volId}`,
      students
    );
  }
  /**
   * ## ??????????????????
   * ### [POST] /signup/<int:volId>/<int:stuId>/rollback
   * #### ??????: Any
   * @param volId
   * @param stuId
   */
  rollback(
    volId: number,
    stuId: number
  ): ForegroundApiRunner<{}> {
    return createForegroundApiRunner(
      this,
      "POST",
      `/signup/${volId}/${stuId}/rollback`
    );
  }
  /**
   * ## ????????????
   * ### [GET] /volunteer/search
   * #### ??????: Any
   * @param kwargs
   */
  searchVolunteers(
    kwargs: structs.SearchVolunteers
  ): ForegroundApiRunner<Array<structs.SingleVolunteer>> {
    return createForegroundApiRunner(
      this,
      "GET",
      `/volunteer/search`,
      kwargs
    );
  }
  /**
   * ## ?????????????????????????????????
   * ### [GET] /volunteer/<int:id>
   * #### ??????: Any
   * @param id
   */
  getVolunteerInfo(
    id: number
  ): ForegroundApiRunner<structs.VolunteerInfoResponse> {
    return createForegroundApiRunner(
      this,
      "GET",
      `/volunteer/${id}`
    );
  }
  /**
   * ## ??????????????????
   * ### [POST] /volunteer/create
   * #### ??????: Any
   * @param classes
   * @param name
   * @param description
   * @param time
   * @param type
   * @param reward
   */
  createVolunteer(
    classes: Array<structs.ClassVol>,
    name: string,
    description: string,
    time: string,
    type: enums.VolType,
    reward: number
  ): ForegroundApiRunner<{}> {
    return createForegroundApiRunner(
      this,
      "POST",
      `/volunteer/create`,
      classes,
      name,
      description,
      time,
      type,
      reward
    );
  }
  /**
   * ## ???????????????????????????????????????
   * ### [POST] /volunteer/create/appointed
   * #### ??????: Any
   * @param joiners
   * @param name
   * @param description
   * @param time
   * @param type
   * @param reward
   */
  createAppointedVolunteer(
    joiners: Array<number>,
    name: string,
    description: string,
    time: string,
    type: enums.VolType,
    reward: number
  ): ForegroundApiRunner<{}> {
    return createForegroundApiRunner(
      this,
      "POST",
      `/volunteer/create/appointed`,
      joiners,
      name,
      description,
      time,
      type,
      reward
    );
  }
  /**
   * ## ????????????
   * ### [POST] /volunteer/<int:id>/modify
   * #### ??????: Any
   * @param id
   * @param classes
   * @param name
   * @param description
   * @param time
   * @param type
   * @param reward
   */
  modifyVolunteer(
    id: number,
    classes: Array<structs.ClassVol>,
    name: string,
    description: string,
    time: string,
    type: enums.VolType,
    reward: number
  ): ForegroundApiRunner<{}> {
    return createForegroundApiRunner(
      this,
      "POST",
      `/volunteer/${id}/modify`,
      classes,
      name,
      description,
      time,
      type,
      reward
    );
  }
  /**
   * ## ????????????
   * ### [POST] /volunteer/<int:id>/delete
   * #### ??????: Any
   * @param id
   */
  deleteVolunteer(
    id: number
  ): ForegroundApiRunner<{}> {
    return createForegroundApiRunner(
      this,
      "POST",
      `/volunteer/${id}/delete`
    );
  }
  /**
   * ## ????????????(??????)
   * ### [POST] /volunteer/<int:id>/audit
   * #### ??????: Class | Teacher
   * @param id
   */
  auditVolunteer(
    id: number
  ): ForegroundApiRunner<{}> {
    return createForegroundApiRunner(
      this,
      "POST",
      `/volunteer/${id}/audit`
    );
  }
  /**
   * ## ???????????????????????????
   * ### [GET] /thought/student/<int:id>
   * #### ??????: Any
   * @param id
   */
  getStudentThoughts(
    id: number
  ): ForegroundApiRunner<structs.StudentThoughtsResponse> {
    return createForegroundApiRunner(
      this,
      "GET",
      `/thought/student/${id}`
    );
  }
  /**
   * ## ????????????
   * ### [GET] /thought/search
   * #### ??????: Any
   * @param kwargs
   */
  searchThoughts(
    kwargs: structs.SearchThoughts
  ): ForegroundApiRunner<Array<structs.SingleThought>> {
    return createForegroundApiRunner(
      this,
      "GET",
      `/thought/search`,
      kwargs
    );
  }
  /**
   * ## ?????????????????????????????????
   * ### [GET] /thought/<int:volId>/<int:stuId>
   * #### ??????: Any
   * @param volId
   * @param stuId
   */
  getThoughtInfo(
    volId: number,
    stuId: number
  ): ForegroundApiRunner<structs.ThoughtInfoResponse> {
    return createForegroundApiRunner(
      this,
      "GET",
      `/thought/${volId}/${stuId}`
    );
  }
  /**
   * ## ??????????????????
   * ### [POST] /thought/<int:volId>/<int:stuId>/save
   * #### ??????: Any
   * @param volId
   * @param stuId
   * @param thought
   * @param pictures
   */
  saveThought(
    volId: number,
    stuId: number,
    thought: string,
    pictures: Array<string>
  ): ForegroundApiRunner<{}> {
    return createForegroundApiRunner(
      this,
      "POST",
      `/thought/${volId}/${stuId}/save`,
      thought,
      pictures
    );
  }
  /**
   * ## ????????????
   * ### [POST] /thought/<int:volId>/<int:stuId>/submit
   * #### ??????: Any
   * @param volId
   * @param stuId
   * @param thought
   * @param pictures
   */
  submitThought(
    volId: number,
    stuId: number,
    thought: string,
    pictures: Array<string>
  ): ForegroundApiRunner<{}> {
    return createForegroundApiRunner(
      this,
      "POST",
      `/thought/${volId}/${stuId}/submit`,
      thought,
      pictures
    );
  }
  /**
   * ## ????????????(??????)
   * ### [POST] /thought/<int:volId>/<int:stuId>/audit/first
   * #### ??????: Class | Teacher
   * @param volId
   * @param stuId
   */
  firstAudit(
    volId: number,
    stuId: number
  ): ForegroundApiRunner<{}> {
    return createForegroundApiRunner(
      this,
      "POST",
      `/thought/${volId}/${stuId}/audit/first`
    );
  }
  /**
   * ## ????????????(?????????)
   * ### [POST] /thought/<int:volId>/<int:stuId>/audit/final
   * #### ??????: Auditor
   * @param volId
   * @param stuId
   * @param reward
   */
  finalAudit(
    volId: number,
    stuId: number,
    reward: number
  ): ForegroundApiRunner<{}> {
    return createForegroundApiRunner(
      this,
      "POST",
      `/thought/${volId}/${stuId}/audit/final`,
      reward
    );
  }
  /**
   * ## ????????????
   * ### [POST] /thought/<int:volId>/<int:stuId>/repulse
   * #### ??????: Any
   * @param volId
   * @param stuId
   * @param reason
   */
  repulse(
    volId: number,
    stuId: number,
    reason: string
  ): ForegroundApiRunner<{}> {
    return createForegroundApiRunner(
      this,
      "POST",
      `/thought/${volId}/${stuId}/repulse`,
      reason
    );
  }
  /**
   * ## ??????????????????
   * ### [GET] /class/list
   * #### ??????: Any
   */
  listClasses(): ForegroundApiRunner<Array<structs.SingleClass>> {
    return createForegroundApiRunner(this, "GET", `/class/list`);
  }
  /**
   * ## ?????????????????????????????????
   * ### [GET] /class/<int:id>
   * #### ??????: Any
   * @param id
   */
  getClassInfo(
    id: number
  ): ForegroundApiRunner<structs.ClassInfoResponse> {
    return createForegroundApiRunner(
      this,
      "GET",
      `/class/${id}`
    );
  }
  /**
   * ## ??????????????????
   * ### [POST] /class/<int:id>/delete
   * #### ??????: System
   * @param id
   */
  deleteClass(
    id: number
  ): ForegroundApiRunner<{}> {
    return createForegroundApiRunner(
      this,
      "POST",
      `/class/${id}/delete`
    );
  }
  /**
   * ## ??????????????????
   * ### [POST] /class/create
   * #### ??????: System
   * @param name
   */
  createClass(
    name: string
  ): ForegroundApiRunner<{}> {
    return createForegroundApiRunner(
      this,
      "POST",
      `/class/create`,
      name
    );
  }
  /**
   * ## ???????????????????????????
   * ### [POST] /class/<int:id>/modify
   * #### ??????: System
   * @param id
   * @param name
   */
  modifyClass(
    id: number,
    name: string
  ): ForegroundApiRunner<{}> {
    return createForegroundApiRunner(
      this,
      "POST",
      `/class/${id}/modify`,
      name
    );
  }


//--METHODS END----

}

export const fApi = new ForegroundApi({
  beforeReq(info: ReqInfo) {},
  errorReq(e: Error, info: ReqInfo) {},

  successedRes(res: AxiosResponse<any>, info: ReqInfo) {},
  failedRes(res: AxiosResponse<any> | undefined, info: ReqInfo) {},

  afterProcess(info: ReqInfo) {},
  errorProcess(e: Error, info: ReqInfo) {},

  cleanup(info: ReqInfo) {},

  defaultFailedToast: true,
  defaultOkToast: true,
}).loadingState;
