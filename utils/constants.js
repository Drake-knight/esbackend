export const SOLO = "SOLO";
export const TEAM = "TEAM";
export const ESUMMIT_IITM_COHENOOR_TOKEN = "ESUMMIT_IITM_COHENOOR_TOKEN";
export const ESUMMIT_IITM_AUTH_TOKEN = "ESUMMIT_IITM_AUTH_TOKEN";
export const ESUMMIT_IITM_ADMIN_AUTH_TOKEN = "ESUMMIT_IITM_ADMIN_AUTH_TOKEN";
export const ESUMMIT_IITM_USER = "ESUMMIT_IITM_USER";

export const ESUMMIT_SECRET = process.env.SECRET;
export const ADMIN_SECRET = process.env.ADMIN_SECRET;
export const IS_PRODUCTION = process.env.NODE_ENV === "production";

export const EVENTS = {
  // Innovation Conclave
  bootcamp: { title: "BootCamp", type: TEAM },
  unconference: { title: "Unconference", type: TEAM },
  "product-construct": { title: "Product Construct", type: TEAM },

  // StartUp Conclave
  elevate: { title: "Elevate", type: TEAM },
  "startup-expo": { title: "Startup Expo", type: SOLO },
  "expert-edge": { title: "Expert Edge", type: SOLO },
  investinder: { title: "Investinder", type: SOLO },
  "sandberg-match": { title: "Sandberg's Match", type: SOLO },

  // Youth Conclave
  yes: { title: "YES", type: TEAM },
  invaso: { title: "Invaso", type: TEAM },
  boardroom: { title: "Boardroom", type: TEAM },
  marketup: { title: "MarketUp", type: TEAM },
  "biz-quiz": { title: "BizQuiz", type: SOLO },
  "stocks-are-high": { title: "Stocks Are High", type: SOLO },
  "idea-validation-meetup": { title: "Idea Validation Meetup", type: TEAM },
  "business-simulation-game": { title: "Business Simulation Game", type: SOLO },
  "e-awards": { title: "E-Awards", type: SOLO },
  "e-lympics": { title: "E-Lympics", type: SOLO },
  "e-auction": { title: "E-Auction", type: TEAM },
  ethletics: { title: "Ethletics", type: TEAM },
  hackstart: { title: "HackStart", type: TEAM },

  // Suspire Sustainability Conclave
  strategize: { title: "Strategize", type: TEAM },
  "solve-to-evolve": { title: "Solve to Evolve", type: TEAM },
  "unnamed-celebrity-challenge": { title: "", type: SOLO }
};
export const OTHER_EVENTS = {
  "crisis-talks": "Crisis Talks",
  inspirit: "Inspirit"
};
export const EVENT_SLUGS = Object.keys(EVENTS);
export const EVENT_TITLES = Object.values(EVENTS).map(({ title }) => title);
export const ROUND_TYPES = ["QUESTIONNAIRE", "TIMED_QUIZ", "FILE_SUBMISSION"];
export const EVENT_STATUS = [
  "NOT_LAUNCHED",
  "ONGOING_REGISTRATION",
  "ACCEPTING_SUBMISSIONS",
  "ONGOING_GRADING",
  "CONCLUDED"
];

export const EVENT_PASS_TITLE_SLUG_MAP = {
  "Basic student pass": "BASIC_STUDENT_PASS",

  "Premium student pass": "PREMIUM_STUDENT_PASS",
  "Professional pass": "PROFESSIONAL_PASS",
  "3 days + 2 nights accomodation": "THREE_DAY_STAY",
  "4 days + 3 nights accomodation": "FOUR_DAY_STAY"
};

export const EVENT_PASS_AMOUNTS = {
  "Basic student pass": 499,
  "Premium student pass": 649,
  "Professional pass": 1000,
  "3 days + 2 nights accomodation": 1999,
  "4 days + 3 nights accomodation": 2499
};

export const EVENT_PASS_ITEMS = Object.values(EVENT_PASS_TITLE_SLUG_MAP);
export const MERCH_AMOUNTS = {
  POLO: 399,
  TEE: 349,
  HOODIE: 599,
  HOODIE_TEE: 899,
  POLO_TEE: 699,
  HOODIE_POLO: {
    normal: 949,
    customisation: 1099
  },
  HOODIE_POLO_TEE: {
    normal: 1249,
    customisation: 1399
  }
};
export const MERCH_SINGLES = ["HOODIE", "POLO", "TEE"];
export const MERCH_COMBOS = [
  "HOODIE_POLO",
  "HOODIE_TEE",
  "POLO_TEE",
  "HOODIE_POLO_TEE"
];
export const MERCH_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];
export const SMAIL_COUPON_CODE = "IITM_NORMAL";
export const BSC_COUPON_CODE = "IITM_BSC";

export const COUPON_INVALID = "Invalid coupon code";
export const COUPON_EXHAUSTED = "Coupon exhausted";
export const COUPON_LIMIT = 20;
export const INVALID_CART_COUPON =
  "Coupon code cannot be applied to basic and professional pass";

export const REFERRAL_CODE_DISCOUNT_MERCH = 1; // 0.95 for 5% discount and so on..
export const MERCH_KEY_TITLE_MAP = {
  HOODIE: "Assemble for the Change! Hoodie",
  POLO: "E-Summit Polo Shirt",
  TEE: "Think Out Of The Tank! Tee",
  HOODIE_POLO: "Pitchers' Combo (Hoodie + Polo T-Shirt)",
  HOODIE_TEE: "Hustlers' Combo (Hoodie + Tee)",
  POLO_TEE: "Sharks' Combo ( Polo T-Shirt + Tee)",
  HOODIE_POLO_TEE: "Changemakers' Combo (Hoodie + Polo T-Shirt + Tee)"
};
