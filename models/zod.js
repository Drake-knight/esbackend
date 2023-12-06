import { z } from "zod";

export const UserType = z.enum(["STARTUP", "INVESTOR"]);

export const StartupDetails = z.object({
  startupName: z.string().nonempty({ message: "Startup name cannot be empty" }),
  startupSite: z.string().nonempty({ message: "Site cannot be empty" }),
  startupFunding: z.string().nonempty({ message: "Funding cannot be empty" }),
  founders: z
    .array(
      z.object({
        founderName: z
          .string()
          .nonempty({ message: "Founder name cannot be empty" }),
        founderEmail: z.string().email({ message: "Invalid founder email!" }),
        founderLinkedin: z
          .string()
          .nonempty({ message: "Founder LinkedIn profile cannot be empty" })
      })
    )
    .nonempty({ message: "You must add atleast 1 founder!" }),
  fileSubmission: z
    .string()
    .nonempty({ message: "A PDF file must be submitted as pitchdeck" })
});

export const InvestorDetails = z.object({
  investorName: z
    .string()
    .nonempty({ message: "Investor name cannot be empty" }),
  investorSite: z.string().nonempty({ message: "Website cannot be empty" }),
  investorMail: z.string().email({ message: "Invalid email adress!" }),
  investorFunding: z.string().nonempty({ message: "Funding cannot be empty" })
});
