// Akure City Life: FUTA slang and NPC dialogue (Day 4 draft)
// Review every line. Fix anything that does not sound like real FUTA talk.

export type HailTarget = "anyone" | "fresher" | "finalist";

export interface Hail {
  id: string;
  to: HailTarget;
  text: string;
}

export interface Line {
  id: string;
  place: string;
  text: string;
}

export interface Npc {
  id: string;
  role: string;
  place: string;
  text: string;
}

export const hails: Hail[] = [
  { id: "h1", to: "anyone", text: "Gee, how far?" },
  { id: "h2", to: "anyone", text: "Boss, kilowa?" },
  { id: "h3", to: "anyone", text: "Comrade, how you dey?" },
  { id: "h4", to: "anyone", text: "Idan, what's happening?" },
  { id: "h5", to: "anyone", text: "Agba, e kaaro o." },
  { id: "h6", to: "anyone", text: "Cho cho! How you dey?" },
  { id: "h7", to: "anyone", text: "Hot boy, I see you o!" },
  { id: "h8", to: "anyone", text: "Alaye, how far na?" },
  { id: "h9", to: "fresher", text: "Fresher! Welcome to FUTA o." },
  { id: "h10", to: "fresher", text: "Na fresher, you don see lecture theatre?" },
  { id: "h11", to: "fresher", text: "FYB, enjoy your final year o." },
  { id: "h12", to: "finalist", text: "Finalist nla! How body?" },
  { id: "h13", to: "finalist", text: "Finalist nla, congratulations in advance." },
  { id: "h14", to: "finalist", text: "Finalist nla, project don finish?" },
];

export const replies: string[] = [
  "I dey whine am o, how you dey?",
  "Cho cho! All good here.",
  "Body dey inside cloth, boss.",
  "We dey, comrade.",
];

export const lines: Line[] = [
  { id: "l1", place: "campus", text: "Power go off by 6pm tonight, charge your phone o." },
  { id: "l2", place: "south-gate", text: "Bus from South Gate to North Gate na 300 naira only." },
  { id: "l3", place: "motion-ground", text: "Black and white na 50 naira, colour na 100 naira." },
  { id: "l4", place: "campus", text: "Food start from 1,000 naira here, no be joke." },
  { id: "l5", place: "motion-ground", text: "Registration cafe don open, online registration dey go on." },
  { id: "l6", place: "library-zone", text: "CBT centre dey full today, come early." },
  { id: "l7", place: "aluta-market", text: "Aluta market get shop for everything, just look well." },
  { id: "l8", place: "motion-ground", text: "Chicken Rep get pie and ice cream if hunger catch you." },
  { id: "l9", place: "north-gate", text: "North Gate carnival dey come, you don get outfit?" },
  { id: "l10", place: "south-gate", text: "Okada dey wait for South Gate, just negotiate well." },
  { id: "l11", place: "outside-gate", text: "Outside school, light no dey sure o, NEPA dey rule there." },
  { id: "l12", place: "library-zone", text: "Library don full, find another place to read." },
  { id: "l13", place: "west-gate", text: "Suya dey burn outside West Gate tonight." },
  { id: "l14", place: "west-gate", text: "Karaoke don start outside the gate." },
  { id: "l15", place: "south-gate", text: "Taxi from Oja Oba don land for South Gate." },
  { id: "l16", place: "library-zone", text: "Check your CBT slot before exam day." },
  { id: "l17", place: "sub", text: "SUB upstairs dey busy today." },
  { id: "l18", place: "west-gate", text: "Lecture start by 8, no come late." },
];

export const npcs: Npc[] = [
  { id: "n1", role: "Bus conductor", place: "south-gate", text: "Eighteen seats, North Gate, 300 naira. Enter, enter!" },
  { id: "n2", role: "Okada rider", place: "south-gate", text: "Boss, where you dey go? I go reach you quick." },
  { id: "n3", role: "Suya seller", place: "west-gate", text: "Oga, suya hot o. Try am, you go come back." },
  { id: "n4", role: "Market woman", place: "south-gate", text: "E kaabo o! Come buy, we go agree on price." },
  { id: "n5", role: "Cafe attendant", place: "motion-ground", text: "Registration? Sit down, I go help you sort am." },
  { id: "n6", role: "Print shop attendant", place: "motion-ground", text: "Black and white 50 naira, colour 100 naira. How many copies?" },
  { id: "n7", role: "Sheriff", place: "north-gate", text: "Good afternoon. ID card, please." },
  { id: "n8", role: "Chicken Rep seller", place: "motion-ground", text: "Pie, ice cream, frozen food. What will you take?" },
  { id: "n9", role: "Bookshop attendant", place: "library-zone", text: "Which course textbook you dey find?" },
  { id: "n10", role: "CBT officer", place: "library-zone", text: "Take your seat. Your system number is on your slip." },
];