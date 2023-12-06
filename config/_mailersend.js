import Mailersend from "mailersend";

const API_KEY = process.env.MAILERSEND_API_KEY;
const mailersend = new Mailersend({ api_key: API_KEY });

export default mailersend;
