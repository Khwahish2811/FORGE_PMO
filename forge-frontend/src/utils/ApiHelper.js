import getCookie from "./cookie";
import {
    STANDARD_METHOD_OPTIONS,
} from "./ApiCommunication";
import { openNotification } from "./NotificationMessageMapping";

export let HEADER_JSON = {
  Accept: "application/json",
  Authorization: JSON.parse(
    localStorage.getItem(`token`)
  ),
  source: "workflow",
  req: "list",
};

/* Cache setting details */
const CACHE_SETTINGS = {
  cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
};

/* Core setting details */
const CORS_SETTINGS = {
  mode: "cors", // no-cors, cors, *same-origin
  // credentials: "same-origin", // include, *same-origin, omit
};

export default class ApiHelper {

  apiCall = (url, method, values) => {
    if (values && values.constructor.name !== "FormData") {
      values = JSON.stringify(values);
      HEADER_JSON["Content-Type"] = "application/json";
    } else {
      delete HEADER_JSON["Content-Type"];
    }
    return fetch(url, {
      ...STANDARD_METHOD_OPTIONS,
      ...CACHE_SETTINGS,
      ...CORS_SETTINGS,
      method,
      headers: {
        ...HEADER_JSON,
        // Authorization: JSON.parse(
        //   localStorage.getItem(
        //     `${process.env.REACT_APP_TOKEN_PREFIX}-auth-token`
        //   )
        // ),
        Authorization: JSON.parse(
          localStorage.getItem(`token`)
        ),
        "X-CSRFToken": getCookie(`${process.env.REACT_APP_TOKEN_PREFIX}-csrftoken`) || "",
      },
      body: values != null ? values : null,
    }).then((res) => {
      if (res.status === 401) {
        localStorage.clear();
        openNotification(
          "error",
          "LOGIN EXPIRED",
          "Your session has expired. Please login again"
        );
        setTimeout(() => {
          window.location =
            process.env.REACT_APP_PROJECT_ROUTE !== "/null" && process.env.REACT_APP_PROJECT_ROUTE !== undefined
              ? process.env.REACT_APP_PROJECT_ROUTE
              : "/";
        }, 2500);
      } else if (res.status === 403) {
        openNotification(
          "error",
          "Authorization",
          "You do not have permission to perform this action."
        );
      }
      return res;
    });
  };
}
