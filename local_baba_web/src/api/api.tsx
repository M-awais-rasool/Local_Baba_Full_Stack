import axios from "axios";

const API_BASE_URL = "http://192.168.100.109:8080/";

export const API = axios.create({
  baseURL: API_BASE_URL,
  timeout: 6000,
});

API.interceptors.request.use(
  function (_config: any) {
    _config.headers["Content-Type"] = "application/json";
    let token = localStorage.getItem("token");
    if (token !== null && token !== "") {
      _config.headers.Authorization = "Bearer " + token;
    }
    return _config;
  },
  function (error) {
    console.log("API ERROR :: " + JSON.stringify(error));
    return Promise.reject(error);
  }
);

export const formatDate = (timestamp: any) => {
  const date = new Date(timestamp);

  const day = date.getDate();
  const suffix =
    day % 10 === 1 && day !== 11
      ? "st"
      : day % 10 === 2 && day !== 12
      ? "nd"
      : day % 10 === 3 && day !== 13
      ? "rd"
      : "th";
  const formattedDay = `${day}${suffix}`;

  const options: any = { month: "short", year: "2-digit", weekday: "long" };
  const formatter = new Intl.DateTimeFormat("en-US", options);
  const parts: any = formatter.formatToParts(date);
  const month = parts.find((part: any) => part.type === "month").value;
  const year = parts.find((part: any) => part.type === "year").value;
  const weekday = parts.find((part: any) => part.type === "weekday").value;

  const timeOptions: any = { hour: "numeric", minute: "numeric", hour12: true };
  const time = new Intl.DateTimeFormat("en-US", timeOptions).format(date);

  return `${formattedDay} ${month}, ${year} ${weekday} · ${time}`;
};
