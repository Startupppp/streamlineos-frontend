import { getAllCountries } from "countries-and-timezones";
import { INDIAN_STATES } from "@/lib/accounting/indian-states";

export const ALL_COUNTRIES = Object.values(getAllCountries())
  .map((c) => c.name)
  .sort((a, b) => a.localeCompare(b));

export const INDIA_COUNTRY_NAME = "India";

export const INDIAN_STATE_NAMES = INDIAN_STATES.map((s) => s.stateName);

/** Major cities grouped by Indian state for address dropdowns */
export const INDIAN_CITIES_BY_STATE: Record<string, readonly string[]> = {
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Tirupati"],
  Assam: ["Guwahati", "Silchar", "Dibrugarh", "Jorhat"],
  Bihar: ["Patna", "Gaya", "Muzaffarpur", "Bhagalpur"],
  Chandigarh: ["Chandigarh"],
  Chhattisgarh: ["Raipur", "Bhilai", "Bilaspur"],
  Delhi: ["New Delhi", "Delhi"],
  Gujarat: ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Gandhinagar"],
  Haryana: ["Gurugram", "Faridabad", "Panipat", "Ambala"],
  "Himachal Pradesh": ["Shimla", "Dharamshala", "Solan"],
  Jharkhand: ["Ranchi", "Jamshedpur", "Dhanbad"],
  Karnataka: ["Bengaluru", "Mysuru", "Mangaluru", "Hubballi"],
  Kerala: ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur"],
  "Madhya Pradesh": ["Bhopal", "Indore", "Gwalior", "Jabalpur"],
  Maharashtra: ["Mumbai", "Pune", "Nagpur", "Nashik", "Thane", "Aurangabad"],
  Manipur: ["Imphal"],
  Meghalaya: ["Shillong"],
  Mizoram: ["Aizawl"],
  Nagaland: ["Kohima", "Dimapur"],
  Odisha: ["Bhubaneswar", "Cuttack", "Rourkela"],
  Punjab: ["Chandigarh", "Ludhiana", "Amritsar", "Jalandhar"],
  Rajasthan: ["Jaipur", "Jodhpur", "Udaipur", "Kota"],
  Sikkim: ["Gangtok"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli"],
  Telangana: ["Hyderabad", "Warangal", "Nizamabad"],
  "Uttar Pradesh": ["Lucknow", "Noida", "Ghaziabad", "Kanpur", "Varanasi"],
  Uttarakhand: ["Dehradun", "Haridwar", "Rishikesh"],
  "West Bengal": ["Kolkata", "Howrah", "Durgapur", "Siliguri"],
  "Jammu and Kashmir": ["Srinagar", "Jammu"],
  "Arunachal Pradesh": ["Itanagar"],
  Tripura: ["Agartala"],
};

export const EMERGENCY_RELATIONSHIPS = [
  { value: "Parent", label: "Parent" },
  { value: "Spouse", label: "Spouse" },
  { value: "Sibling", label: "Sibling" },
  { value: "Child", label: "Child" },
  { value: "Friend", label: "Friend" },
  { value: "Other", label: "Other" },
] as const;

export const PERSON_NAME_REGEX = /^[A-Za-z][A-Za-z\s'.-]{1,79}$/;
export const STREET_ADDRESS_REGEX = /^[A-Za-z0-9][A-Za-z0-9\s.,#/-]{2,119}$/;
export const INDIAN_PINCODE_REGEX = /^[1-9][0-9]{5}$/;

export function citiesForState(state: string): readonly string[] {
  return INDIAN_CITIES_BY_STATE[state] ?? [];
}

export function isValidCountry(country: string): boolean {
  return ALL_COUNTRIES.includes(country);
}

export function isValidIndianState(state: string): boolean {
  return INDIAN_STATE_NAMES.includes(state);
}

export function isValidCityForState(state: string, city: string): boolean {
  return citiesForState(state).includes(city);
}
