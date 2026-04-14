import { describe, it, expect } from "vitest";
import de from "@/i18n/de";
import en from "@/i18n/en";
import es from "@/i18n/es";
import fr from "@/i18n/fr";
import tr from "@/i18n/tr";
import ar from "@/i18n/ar";

const reference = { name: "de", keys: Object.keys(de) };
const langs = [
  { name: "en", dict: en },
  { name: "es", dict: es },
  { name: "fr", dict: fr },
  { name: "tr", dict: tr },
  { name: "ar", dict: ar },
];

describe("i18n key sync", () => {
  for (const { name, dict } of langs) {
    it(`${name} has all keys from ${reference.name}`, () => {
      const missing = reference.keys.filter((k) => !(k in dict));
      expect(missing, `${name} is missing keys: ${missing.join(", ")}`).toEqual([]);
    });

    it(`${name} has no extra keys beyond ${reference.name}`, () => {
      const extra = Object.keys(dict).filter((k) => !de[k]);
      expect(extra, `${name} has extra keys: ${extra.join(", ")}`).toEqual([]);
    });
  }
});
