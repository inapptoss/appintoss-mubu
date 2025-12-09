import axios from "axios";
import axiosRetry from "axios-retry";

export const http = axios.create({ timeout: 8000 });
axiosRetry(http, { retries: 2, retryDelay: axiosRetry.exponentialDelay });
