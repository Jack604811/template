import Cryptr from "cryptr";

let cryptrInstance: Cryptr | null = null;

const getCryptr = () => {
  if (!cryptrInstance) {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
      throw new Error(
        "ENCRYPTION_KEY environment variable is required. Please set it in your environment variables.",
      );
    }
    cryptrInstance = new Cryptr(key);
  }
  return cryptrInstance;
};

export const encrypt = (text: string) => {
  return getCryptr().encrypt(text);
};

export const decrypt = (text: string) => {
  return getCryptr().decrypt(text);
};
