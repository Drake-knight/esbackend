import mailersend from "../config/_mailersend.js";
import { Recipient, EmailParams, BulkEmails } from "mailersend";
import logger from "./loggerUtils.js";

const createVariables = (email, data) => [
  {
    email,
    substitutions: Object.entries(data).map(([key, value]) => ({
      var: key,
      value
    }))
  }
];

const createPersonalization = (email, personalizationData) => {
  if (!personalizationData) {
    return null;
  }
  return [
    {
      email,
      data: {
        elements: personalizationData
      }
    }
  ];
};

export const mailTemplates = Object.freeze({
  "email-verification": "3yxj6lj8o7gdo2rm",
  welcome: "z86org8q3egew137",
  "event-welcome": "7dnvo4dqo3l5r86y",
  "password-reset": "yzkq34060k4d7961",
  "one-time-login": "vywj2lpr2p47oqzd",
  apology: "3vz9dlenr7lkj50y",
  "merch-order-confirmation": "pr9084zkpye4w63d",
  "event-notification": "",
  "pass-notification": "jpzkmgq7n7vl059v",
  "accomodation-status": "pxkjn41zq30lz781"
});
/**
 * @param {"email-verification" | "welcome" | "password-reset" | "order-successful" | "event-notification" | "pass-notification" | "merch-order-confirmation"} type
 */
export const sendMail = async (
  email,
  type,
  data,
  personalizationData = null
) => {
  try {
    if (process.env.NODE_ENV === "development") {
      logger.info("Use this", { email, type, data });
      return;
    }
    const recipients = [new Recipient(email, data.name)];
    const variables = createVariables(email, data);
    const personalization = createPersonalization(email, personalizationData);

    const emailParams = new EmailParams()
      .setRecipients(recipients)
      .setTemplateId(mailTemplates[type])
      .setVariables(variables);

    console.log({ personalization, data });
    if (personalization) {
      emailParams.setPersonalization(personalization);
    }

    const res = await mailersend.send(emailParams);
    // console.log(res.status);
    // const resInternals =
    //   res[
    //     Object.getOwnPropertySymbols(res).find(
    //       s => s.description === "status"
    //     )
    //   ];
    //   console.log("HELLOOO", resInternals);
    const statusCode = res.status;

    if (statusCode >= 400) {
      const err = new Error();
      err.data = res;
      throw err;
    }

    logger.info("Email sent", { email, type });
  } catch (error) {
    logger.error(1, error);
  }
};

export const sendBulkMails = async (type, bulks) => {
  const bulkEmails = new BulkEmails();

  const emailParamObjects = bulks.map(({ email, ...data }) => {
    new EmailParams();
    const recipients = [new Recipient(email, data.name)];
    const variables = createVariables(email, data);

    const emailParams = new EmailParams()
      .setRecipients(recipients)
      .setTemplateId(mailTemplates[type])
      .setVariables(variables);

    return emailParams;
  });

  bulkEmails.addEmails(emailParamObjects);

  const res = await mailersend.sendBulk(bulkEmails);
  logger.info("Bulk emails Sent", await res.json());

  const resInternals =
    res[
      Object.getOwnPropertySymbols(res).find(
        s => s.description === "Response internals"
      )
    ];
  const statusCode = resInternals.status;

  if (statusCode >= 400) {
    const err = new Error();
    err.data = res;
    throw err;
  }
};
