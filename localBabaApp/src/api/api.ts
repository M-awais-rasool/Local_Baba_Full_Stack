import NetInfo from '@react-native-community/netinfo';
import axios from 'axios';
import {cacheData} from '../module';
import { Platform } from 'react-native';
import {check, request, PERMISSIONS, RESULTS} from 'react-native-permissions';

const API_BASE_URL = 'http://192.168.100.109:8080/';
let token: any;
let role: any;
let name: any;


export const API = axios.create({
  baseURL: API_BASE_URL,
  timeout: 6000,
});

API.interceptors.request.use(
  function (_config: any) {
    _config.headers['Content-Type'] = 'application/json';

    if (token !== null && token !== '') {
      _config.headers.Authorization = 'Bearer ' + token;
    }
    return _config;
  },
  function (error) {
    console.log('API ERROR :: ' + JSON.stringify(error));
  },
);

export const API_FORMDATA = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
});

API_FORMDATA.interceptors.request.use(
  function (_config: any) {
    _config.headers['Content-Type'] = 'multipart/form-data';

    if (token !== null && token !== '') {
      _config.headers.Authorization = 'Bearer ' + token;
    }
    return _config;
  },
  function (error) {
    console.log('API ERROR :: ' + JSON.stringify(error));
  },
);

export const apiError = (error: any) => {
  console.log(error?.response);
  if (error.response) {
    if (error?.response.status == 401) {
      return 'Unauthorized User! Please Login again.';
    } else if (error.response.status == 403) {
      return 'You are not authorized to access the requested resource.';
    } else if (error.response.status == 404) {
      return 'Requested URL not found.';
    } else if (error.response.status == 500) {
      return 'Internal Server Error';
    } else {
      return error.response.data.message;
    }
  } else if (error.message) {
    return error.message;
  }
};

export const saveToken = (data?: any, Role?: any, Name?: any) => {
  token = data;
  role = Role;
  name = Name;
};

export const getRole = () => {
  console.log(role)
  return role;
};

export const getToken = () => {
  return token;
};
export const getName = () => {
  return name;
};

export const isNetworkAvailable = async () => {
  let response = false;
  await NetInfo.fetch().then((networkState: any) => {
    response = networkState.isConnected;
  });
  return response;
};

export const logout = () => {
  cacheData.removeAllDataFromCache();
  // saveToken(null);
};

export const checkPermission = async (item: string) => {
  let finalData: any;
  if (item === 'camera') {
    let response: any;
    if (Platform.OS === 'android') {
      response = await check(PERMISSIONS.ANDROID.CAMERA)
        .then(async result => {
          let data: any;
          console.log(JSON.stringify(result));
          switch (result) {
            case RESULTS.UNAVAILABLE:
              data = await permissionRequest(item);
              break;
            case RESULTS.DENIED:
              data = await permissionRequest(item);
              break;
            case RESULTS.GRANTED:
              data = {
                result: true,
                permission: 'GRANTED',
              };
              break;
            case RESULTS.BLOCKED:
              data = await permissionRequest(item);
              break;
          }
          return data;
        })
        .catch(async _error => {
          return await permissionRequest(item);
        });
    } else if (Platform.OS === 'ios') {
      response = await check(PERMISSIONS.IOS.CAMERA)
        .then(async result => {
          let data: any;
          switch (result) {
            case RESULTS.UNAVAILABLE:
              data = await permissionRequest(item);
              break;
            case RESULTS.DENIED:
              data = await permissionRequest(item);
              break;
            case RESULTS.GRANTED:
              data = {
                result: true,
                permission: 'GRANTED',
              };
              break;
            case RESULTS.BLOCKED:
              data = await permissionRequest(item);
              break;
          }
          return data;
        })
        .catch(async _error => {
          return await permissionRequest(item);
        });
    }
    finalData = response;
    return response;
  } else if (item === 'gallery') {
    let response: any;
    if (Platform.OS === 'android') {
      response = await check(PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE)
        .then(async result => {
          let data: any;
          switch (result) {
            case RESULTS.UNAVAILABLE:
              data = await permissionRequest(item);
              break;
            case RESULTS.DENIED:
              data = await permissionRequest(item);
              break;
            case RESULTS.GRANTED:
              data = {
                result: true,
                permission: 'GRANTED',
              };
              break;
            case RESULTS.BLOCKED:
              data = await permissionRequest(item);
              break;
          }
          return data;
        })
        .catch(async _error => {
          return await permissionRequest(item);
        });
    } else if (Platform.OS === 'ios') {
      response = await check(PERMISSIONS.IOS.PHOTO_LIBRARY)
        .then(async result => {
          let data: any;
          switch (result) {
            case RESULTS.UNAVAILABLE:
              data = await permissionRequest(item);
              break;
            case RESULTS.LIMITED:
              data = await permissionRequest(item);
              break;
            case RESULTS.DENIED:
              data = await permissionRequest(item);
              break;
            case RESULTS.GRANTED:
              data = {
                result: true,
                permission: 'GRANTED',
              };
              break;
            case RESULTS.BLOCKED:
              data = await permissionRequest(item);
              break;
          }
          return data;
        })
        .catch(async _error => {
          return await permissionRequest(item);
        });
    }
    finalData = response;
    return response;
  } else if (item === 'location') {
    let response: any;
    if (Platform.OS === 'android') {
      response = await check(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION)
        .then(async result => {
          let data: any;
          switch (result) {
            case RESULTS.UNAVAILABLE:
              data = await permissionRequest(item);
              break;
            case RESULTS.DENIED:
              data = await permissionRequest(item);
              break;
            case RESULTS.GRANTED:
              data = {
                result: true,
                permission: 'GRANTED',
              };
              break;
            case RESULTS.BLOCKED:
              data = await permissionRequest(item);
              break;
          }
          return data;
        })
        .catch(async _error => {
          return await permissionRequest(item);
        });
    } else if (Platform.OS === 'ios') {
      response = await check(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE)
        .then(async result => {
          let data: any;
          switch (result) {
            case RESULTS.UNAVAILABLE:
              data = await permissionRequest(item);
              break;
            case RESULTS.LIMITED:
              data = await permissionRequest(item);
              break;
            case RESULTS.DENIED:
              data = await permissionRequest(item);
              break;
            case RESULTS.GRANTED:
              data = {
                result: true,
                permission: 'GRANTED',
              };
              break;
            case RESULTS.BLOCKED:
              data = await permissionRequest(item);
              break;
          }
          return data;
        })
        .catch(async _error => {
          return await permissionRequest(item);
        });
    }
    finalData = response;
    return response;
  }
  return finalData;
};

const permissionRequest = async (item: string) => {
  let finalData: any;
  if (item === 'camera') {
    let response: any;
    if (Platform.OS === 'android') {
      response = await request(PERMISSIONS.ANDROID.CAMERA).then(result => {
        let data: any;
        console.log(JSON.stringify(result));
        switch (result) {
          case RESULTS.UNAVAILABLE:
            data = {
              result: false,
              permission: 'UNAVAILABLE',
            };
            break;
          case RESULTS.DENIED:
            data = {
              result: false,
              permission: 'DENIED',
            };
            break;
          case RESULTS.LIMITED:
            data = {
              result: false,
              permission: 'LIMITED',
            };
            break;
          case RESULTS.GRANTED:
            data = {
              result: true,
              permission: 'GRANTED',
            };
            break;
          case RESULTS.BLOCKED:
            data = {
              result: false,
              permission: 'BLOCKED',
            };
            break;
        }
        return data;
      });
    } else if (Platform.OS === 'ios') {
      response = await request(PERMISSIONS.IOS.CAMERA).then(result => {
        let data: any;
        switch (result) {
          case RESULTS.UNAVAILABLE:
            data = {
              result: false,
              permission: 'UNAVAILABLE',
            };
            break;
          case RESULTS.DENIED:
            data = {
              result: false,
              permission: 'DENIED',
            };
            break;
          case RESULTS.LIMITED:
            data = {
              result: false,
              permission: 'LIMITED',
            };
            break;
          case RESULTS.GRANTED:
            data = {
              result: true,
              permission: 'GRANTED',
            };
            break;
          case RESULTS.BLOCKED:
            data = {
              result: false,
              permission: 'BLOCKED',
            };
            break;
        }
        return data;
      });
    }
    finalData = response;
    return response;
  } else if (item === 'gallery') {
    let response: any;
    if (Platform.OS === 'android') {
      response = await request(PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE).then(
        result => {
          let data: any;
          switch (result) {
            case RESULTS.UNAVAILABLE:
              data = {
                result: false,
                permission: 'UNAVAILABLE',
              };
              break;
            case RESULTS.DENIED:
              data = {
                result: false,
                permission: 'DENIED',
              };
              break;
            case RESULTS.LIMITED:
              data = {
                result: false,
                permission: 'LIMITED',
              };
              break;
            case RESULTS.GRANTED:
              data = {
                result: true,
                permission: 'GRANTED',
              };
              break;
            case RESULTS.BLOCKED:
              data = {
                result: false,
                permission: 'BLOCKED',
              };
              break;
          }
          return data;
        },
      );
    } else if (Platform.OS === 'ios') {
      response = await request(PERMISSIONS.IOS.PHOTO_LIBRARY).then(result => {
        let data: any;
        switch (result) {
          case RESULTS.UNAVAILABLE:
            data = {
              result: false,
              permission: 'UNAVAILABLE',
            };
            break;
          case RESULTS.DENIED:
            data = {
              result: false,
              permission: 'DENIED',
            };
            break;
          case RESULTS.LIMITED:
            data = {
              result: false,
              permission: 'LIMITED',
            };
            break;
          case RESULTS.GRANTED:
            data = {
              result: true,
              permission: 'GRANTED',
            };
            break;
          case RESULTS.BLOCKED:
            data = {
              result: false,
              permission: 'BLOCKED',
            };
            break;
        }
        return data;
      });
    }
    finalData = response;
    return response;
  } else if (item === 'location') {
    let response: any;
    if (Platform.OS === 'android') {
      response = await request(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION).then(
        result => {
          let data: any;
          switch (result) {
            case RESULTS.UNAVAILABLE:
              data = {
                result: false,
                permission: 'UNAVAILABLE',
              };
              break;
            case RESULTS.DENIED:
              data = {
                result: false,
                permission: 'DENIED',
              };
              break;
            case RESULTS.LIMITED:
              data = {
                result: false,
                permission: 'LIMITED',
              };
              break;
            case RESULTS.GRANTED:
              data = {
                result: true,
                permission: 'GRANTED',
              };
              break;
            case RESULTS.BLOCKED:
              data = {
                result: false,
                permission: 'BLOCKED',
              };
              break;
          }
          return data;
        },
      );
    } else if (Platform.OS === 'ios') {
      response = await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE).then(
        result => {
          let data: any;
          switch (result) {
            case RESULTS.UNAVAILABLE:
              data = {
                result: false,
                permission: 'UNAVAILABLE',
              };
              break;
            case RESULTS.DENIED:
              data = {
                result: false,
                permission: 'DENIED',
              };
              break;
            case RESULTS.LIMITED:
              data = {
                result: false,
                permission: 'LIMITED',
              };
              break;
            case RESULTS.GRANTED:
              data = {
                result: true,
                permission: 'GRANTED',
              };
              break;
            case RESULTS.BLOCKED:
              data = {
                result: false,
                permission: 'BLOCKED',
              };
              break;
          }
          return data;
        },
      );
    }
    finalData = response;
    return response;
  }
  return finalData;
};