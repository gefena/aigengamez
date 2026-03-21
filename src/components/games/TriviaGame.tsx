"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import styles from "@/app/games/[id]/page.module.css";

// ── CSS animations ─────────────────────────────────────────────────────────────
const KEYFRAMES = `
@keyframes tr-pop-in {
  from { transform: scale(0.5); opacity: 0; }
  to   { transform: scale(1);   opacity: 1; }
}
@keyframes tr-correct-pulse {
  0%   { box-shadow: 0 0 0 0   rgba(76,175,80,0.7); }
  70%  { box-shadow: 0 0 0 10px rgba(76,175,80,0); }
  100% { box-shadow: 0 0 0 0   rgba(76,175,80,0); }
}
@keyframes tr-wrong-shake {
  0%,100% { transform: translateX(0); }
  20%     { transform: translateX(-6px); }
  40%     { transform: translateX(6px); }
  60%     { transform: translateX(-4px); }
  80%     { transform: translateX(4px); }
}
@keyframes tr-fade-slide {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes tr-timer-pulse {
  0%,100% { opacity: 1; }
  50%     { opacity: 0.55; }
}
@keyframes tr-streak-pop {
  0%   { transform: scale(0.4); opacity: 0; }
  60%  { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(1);   opacity: 1; }
}
`;

// ── Types ──────────────────────────────────────────────────────────────────────
type Phase = "idle" | "playing" | "over";
type Mode = "kids" | "adult";

interface Question {
  id: number;
  mode: Mode;
  category: string;
  emoji?: string;
  question: string;
  options: [string, string, string, string];
  correct: 0 | 1 | 2 | 3;
}

// ── Question banks ─────────────────────────────────────────────────────────────
const KIDS_QUESTIONS: Question[] = [
  { id: 1,  mode: "kids", category: "Animals",   emoji: "🐘",       question: "What animal is this?",                                          options: ["Elephant","Rhino","Hippo","Giraffe"],                      correct: 0 },
  { id: 2,  mode: "kids", category: "Animals",   emoji: "🦒",       question: "Which animal has the longest neck?",                            options: ["Horse","Camel","Giraffe","Zebra"],                         correct: 2 },
  { id: 3,  mode: "kids", category: "Animals",   emoji: "🐧",       question: "This bird cannot fly. What is it?",                            options: ["Parrot","Penguin","Eagle","Owl"],                          correct: 1 },
  { id: 4,  mode: "kids", category: "Animals",   emoji: "🐙",       question: "How many arms does an octopus have?",                          options: ["4","6","8","10"],                                          correct: 2 },
  { id: 5,  mode: "kids", category: "Animals",   emoji: "🦁🐯🐻",   question: "Which of these is NOT a big cat?",                             options: ["Lion","Tiger","Bear","Leopard"],                           correct: 2 },
  { id: 6,  mode: "kids", category: "Animals",   emoji: "🐝",       question: "What do bees make?",                                           options: ["Milk","Honey","Juice","Butter"],                           correct: 1 },
  { id: 7,  mode: "kids", category: "Animals",   emoji: "🐸",       question: "Where do frogs lay their eggs?",                               options: ["In trees","In sand","In water","Underground"],             correct: 2 },
  { id: 8,  mode: "kids", category: "Animals",   emoji: "🦋",       question: "What did a butterfly used to be?",                             options: ["A bee","A worm","A caterpillar","A moth"],                 correct: 2 },
  { id: 9,  mode: "kids", category: "Animals",   emoji: "🐬",       question: "What kind of animal is a dolphin?",                            options: ["Fish","Reptile","Mammal","Bird"],                          correct: 2 },
  { id: 10, mode: "kids", category: "Animals",   emoji: "🦊",       question: "What color is a fox?",                                         options: ["Blue","Green","Orange","Purple"],                          correct: 2 },
  { id: 11, mode: "kids", category: "Food",      emoji: "🍌",       question: "What fruit is yellow and curved?",                             options: ["Apple","Banana","Mango","Lemon"],                          correct: 1 },
  { id: 12, mode: "kids", category: "Food",      emoji: "🍕",       question: "What shape is a pizza slice?",                                 options: ["Square","Circle","Triangle","Star"],                       correct: 2 },
  { id: 13, mode: "kids", category: "Food",      emoji: "🥕",       question: "What color is a carrot?",                                      options: ["Red","Orange","Yellow","Purple"],                          correct: 1 },
  { id: 14, mode: "kids", category: "Food",      emoji: "🍓🍒🍇",   question: "Which of these fruits is NOT red?",                            options: ["Strawberry","Cherry","Grape","Raspberry"],                 correct: 2 },
  { id: 15, mode: "kids", category: "Food",      emoji: "🌽",       question: "What color is corn?",                                          options: ["Red","Blue","Yellow","Green"],                             correct: 2 },
  { id: 16, mode: "kids", category: "Food",      emoji: "🍦",       question: "What is ice cream mainly made from?",                          options: ["Orange juice","Milk","Water","Honey"],                     correct: 1 },
  { id: 17, mode: "kids", category: "Science",   emoji: "🌈",       question: "How many colors are in a rainbow?",                            options: ["5","6","7","8"],                                           correct: 2 },
  { id: 18, mode: "kids", category: "Science",   emoji: "☀️",       question: "What is at the center of our solar system?",                   options: ["Earth","Moon","Sun","Mars"],                               correct: 2 },
  { id: 19, mode: "kids", category: "Science",   emoji: "🌙",       question: "How long does the Moon take to orbit Earth?",                  options: ["1 day","1 week","About 1 month","1 year"],                 correct: 2 },
  { id: 20, mode: "kids", category: "Science",   emoji: "💧",       question: "What is water made of?",                                       options: ["Air and fire","Hydrogen and oxygen","Salt and sugar","Carbon and ice"], correct: 1 },
  { id: 21, mode: "kids", category: "Science",   emoji: "🌱",       question: "What do plants need to grow?",                                 options: ["Just water","Just sunlight","Sunlight, water and air","Only soil"], correct: 2 },
  { id: 22, mode: "kids", category: "Science",   emoji: "❄️",       question: "At what temperature does water freeze?",                       options: ["10°C","0°C","-10°C","100°C"],                              correct: 1 },
  { id: 23, mode: "kids", category: "Geography", emoji: "🌍",       question: "What is the biggest ocean on Earth?",                          options: ["Atlantic","Indian","Arctic","Pacific"],                    correct: 3 },
  { id: 24, mode: "kids", category: "Geography", emoji: "🏔️",      question: "What is the tallest mountain in the world?",                   options: ["K2","Mont Blanc","Everest","Kilimanjaro"],                 correct: 2 },
  { id: 25, mode: "kids", category: "Geography", emoji: "🗼",       question: "In which city is the Eiffel Tower?",                           options: ["London","Rome","Berlin","Paris"],                          correct: 3 },
  { id: 26, mode: "kids", category: "Geography", emoji: "🇦🇺",      question: "What animals appear on Australia's coat of arms?",             options: ["Koala & Wombat","Kangaroo & Emu","Crocodile & Snake","Platypus & Dingo"], correct: 1 },
  { id: 27, mode: "kids", category: "Numbers",   emoji: "🎲🎲",     question: "If you roll 6 and 4 on two dice, what is the total?",         options: ["8","9","10","11"],                                         correct: 2 },
  { id: 28, mode: "kids", category: "Numbers",   emoji: "🍎🍎🍎",   question: "How many apples are shown here?",                              options: ["2","3","4","5"],                                           correct: 1 },
  { id: 29, mode: "kids", category: "Numbers",   emoji: "🔺",       question: "How many sides does a triangle have?",                         options: ["2","3","4","5"],                                           correct: 1 },
  { id: 30, mode: "kids", category: "Numbers",   emoji: "🕒",       question: "It's 3 o'clock. Add 2 hours — what time is it?",              options: ["4 o'clock","5 o'clock","6 o'clock","7 o'clock"],          correct: 1 },
  { id: 31, mode: "kids", category: "Stories",   emoji: "🐻",       question: "In the Jungle Book, what animal is Baloo?",                    options: ["Elephant","Tiger","Bear","Wolf"],                          correct: 2 },
  { id: 32, mode: "kids", category: "Stories",   emoji: "🧞",       question: "In Aladdin, how many wishes does the genie grant?",            options: ["1","2","3","4"],                                           correct: 2 },
  { id: 33, mode: "kids", category: "Science",   emoji: "🧲",       question: "What are magnets attracted to?",                                 options: ["Wood","Plastic","Metal","Glass"],                           correct: 2 },
  { id: 34, mode: "kids", category: "Science",   emoji: "🌊",       question: "What mainly causes ocean tides?",                               options: ["The Sun","The Moon","Wind","Earthquakes"],                  correct: 1 },
  { id: 35, mode: "kids", category: "Science",   emoji: "💡",       question: "Who invented the practical lightbulb?",                         options: ["Einstein","Edison","Newton","Tesla"],                       correct: 1 },
  { id: 36, mode: "kids", category: "Science",   emoji: "🌡️",      question: "What does a thermometer measure?",                               options: ["Weight","Time","Temperature","Speed"],                      correct: 2 },
  { id: 37, mode: "kids", category: "Science",   emoji: "🌍",       question: "How long does Earth take to orbit the Sun?",                    options: ["1 day","1 month","6 months","1 year"],                      correct: 3 },
  { id: 38, mode: "kids", category: "Geography", emoji: "🌎",       question: "On which continent is Brazil?",                                 options: ["Africa","Europe","Australia","South America"],              correct: 3 },
  { id: 39, mode: "kids", category: "Geography", emoji: "🗺️",      question: "Which continent is the biggest?",                               options: ["Africa","Europe","Asia","North America"],                   correct: 2 },
  { id: 40, mode: "kids", category: "Geography", emoji: "🏜️",      question: "What is the world's largest hot desert?",                       options: ["Gobi","Sahara","Arabian","Kalahari"],                       correct: 1 },
  { id: 41, mode: "kids", category: "Geography", emoji: "🌊",       question: "Which ocean lies between Europe and North America?",            options: ["Pacific","Indian","Arctic","Atlantic"],                     correct: 3 },
  { id: 42, mode: "kids", category: "Sports",    emoji: "⚽",       question: "How many players are on a soccer team?",                        options: ["9","10","11","12"],                                         correct: 2 },
  { id: 43, mode: "kids", category: "Sports",    emoji: "🏀",       question: "In basketball, how many points is a three-pointer worth?",      options: ["1","2","3","4"],                                            correct: 2 },
  { id: 44, mode: "kids", category: "Sports",    emoji: "🎾",       question: "In tennis, what word means a score of zero?",                   options: ["Nil","Zero","Love","Duck"],                                 correct: 2 },
  { id: 45, mode: "kids", category: "Stories",   emoji: "🦁",       question: "In The Lion King, what is Simba's father's name?",              options: ["Scar","Mufasa","Rafiki","Timon"],                           correct: 1 },
  { id: 46, mode: "kids", category: "Stories",   emoji: "❄️",       question: "In Frozen, what are Elsa's magical powers?",                    options: ["Fire","Water","Ice and Snow","Wind"],                       correct: 2 },
  { id: 47, mode: "kids", category: "Stories",   emoji: "🐟",       question: "In Finding Nemo, what type of fish is Nemo?",                   options: ["Goldfish","Tuna","Clownfish","Angelfish"],                  correct: 2 },
  { id: 48, mode: "kids", category: "Music",     emoji: "🎸",       question: "How many strings does a standard guitar have?",                 options: ["4","5","6","8"],                                            correct: 2 },
  { id: 49, mode: "kids", category: "Body",      emoji: "❤️",       question: "Which organ pumps blood around your body?",                     options: ["Liver","Lungs","Brain","Heart"],                            correct: 3 },
  { id: 50, mode: "kids", category: "Body",      emoji: "🦷",       question: "How many teeth do most adults have?",                           options: ["24","28","32","36"],                                        correct: 2 },
  { id: 51, mode: "kids", category: "Colors",    emoji: "🎨",       question: "What color do blue and yellow make together?",                  options: ["Orange","Green","Purple","Pink"],                           correct: 1 },
  { id: 52, mode: "kids", category: "Colors",    emoji: "🎨",       question: "Mix red and white — what color do you get?",                    options: ["Purple","Orange","Pink","Brown"],                           correct: 2 },
  { id: 53, mode: "kids", category: "Space",     emoji: "🪐",       question: "Which planet is famous for its giant rings?",                   options: ["Mars","Jupiter","Saturn","Neptune"],                        correct: 2 },
  { id: 54, mode: "kids", category: "Space",     emoji: "🌠",       question: "A 'shooting star' is actually what?",                           options: ["A falling star","A comet","A meteor","A satellite"],       correct: 2 },
  { id: 55, mode: "kids", category: "Food",      emoji: "🍫",       question: "Where does chocolate come from?",                               options: ["Cacao beans","Coffee beans","Sugar cane","Wheat"],          correct: 0 },
];

const ADULT_QUESTIONS: Question[] = [
  { id: 101, mode: "adult", category: "Science",      question: "What is the chemical symbol for gold?",                                    options: ["Go","Gd","Au","Ag"],                                       correct: 2 },
  { id: 102, mode: "adult", category: "Science",      question: "How many bones are in an adult human body?",                               options: ["186","206","226","246"],                                   correct: 1 },
  { id: 103, mode: "adult", category: "Science",      question: "Which planet has the most moons in our solar system?",                     options: ["Jupiter","Saturn","Uranus","Neptune"],                     correct: 1 },
  { id: 104, mode: "adult", category: "Science",      question: "What is the hardest natural substance on Earth?",                          options: ["Titanium","Quartz","Diamond","Corundum"],                  correct: 2 },
  { id: 105, mode: "adult", category: "Science",      question: "What gas do plants absorb during photosynthesis?",                         options: ["Oxygen","Nitrogen","Carbon dioxide","Hydrogen"],           correct: 2 },
  { id: 106, mode: "adult", category: "Science",      question: "Approximately how fast does light travel (km/s)?",                         options: ["200,000","300,000","400,000","150,000"],                   correct: 1 },
  { id: 107, mode: "adult", category: "Science",      question: "DNA stands for:",                                                          options: ["Deoxyribonucleic acid","Dinitrogen adenosine","Dual nitrogen acid","Diribose nucleic acid"], correct: 0 },
  { id: 108, mode: "adult", category: "Science",      question: "Which element has atomic number 1?",                                       options: ["Helium","Lithium","Carbon","Hydrogen"],                    correct: 3 },
  { id: 109, mode: "adult", category: "History",      question: "In which year did World War II end?",                                      options: ["1943","1944","1945","1946"],                               correct: 2 },
  { id: 110, mode: "adult", category: "History",      question: "Which ancient wonder was located in Alexandria, Egypt?",                   options: ["The Colossus","The Lighthouse","The Mausoleum","The Hanging Gardens"], correct: 1 },
  { id: 111, mode: "adult", category: "History",      question: "Who was the first woman to win a Nobel Prize?",                            options: ["Rosalind Franklin","Marie Curie","Ada Lovelace","Lise Meitner"], correct: 1 },
  { id: 112, mode: "adult", category: "History",      question: "The Great Wall of China was built mainly to defend against which group?",  options: ["Mongols","Japanese","Koreans","Persians"],                 correct: 0 },
  { id: 113, mode: "adult", category: "History",      question: "In what year did the Berlin Wall fall?",                                   options: ["1987","1988","1989","1990"],                               correct: 2 },
  { id: 114, mode: "adult", category: "History",      question: "Which empire was ruled by Genghis Khan?",                                  options: ["Ottoman","Mongol","Ming","Mughal"],                        correct: 1 },
  { id: 115, mode: "adult", category: "History",      question: "The Renaissance began in which country?",                                  options: ["France","Greece","Italy","Spain"],                         correct: 2 },
  { id: 116, mode: "adult", category: "Geography",    question: "What is the capital of Australia?",                                        options: ["Sydney","Melbourne","Brisbane","Canberra"],                correct: 3 },
  { id: 117, mode: "adult", category: "Geography",    question: "Which country has the most natural lakes?",                                options: ["Russia","USA","Canada","Brazil"],                          correct: 2 },
  { id: 118, mode: "adult", category: "Geography",    question: "The Amazon River flows primarily through which country?",                  options: ["Colombia","Peru","Brazil","Venezuela"],                    correct: 2 },
  { id: 119, mode: "adult", category: "Geography",    question: "Which is the smallest country in the world by area?",                     options: ["Monaco","Liechtenstein","San Marino","Vatican City"],      correct: 3 },
  { id: 120, mode: "adult", category: "Geography",    question: "What is the longest river in Africa?",                                     options: ["Congo","Niger","Zambezi","Nile"],                          correct: 3 },
  { id: 121, mode: "adult", category: "Geography",    question: "Which mountain range separates Europe from Asia?",                         options: ["Alps","Caucasus","Ural","Carpathians"],                    correct: 2 },
  { id: 122, mode: "adult", category: "Pop Culture",  question: "In Breaking Bad, what do street buyers call Walter White's product?",      options: ["Ice","Blue Sky","Crystal","Snow"],                         correct: 1 },
  { id: 123, mode: "adult", category: "Pop Culture",  question: "Which band released 'The Dark Side of the Moon'?",                        options: ["Led Zeppelin","The Beatles","Pink Floyd","The Rolling Stones"], correct: 2 },
  { id: 124, mode: "adult", category: "Pop Culture",  question: "Who directed the film Inception (2010)?",                                  options: ["Ridley Scott","James Cameron","Christopher Nolan","Steven Spielberg"], correct: 2 },
  { id: 125, mode: "adult", category: "Pop Culture",  question: "In what year was the first iPhone released?",                              options: ["2005","2006","2007","2008"],                               correct: 2 },
  { id: 126, mode: "adult", category: "Pop Culture",  question: "Which game franchise features the character Master Chief?",               options: ["Call of Duty","Halo","Destiny","Gears of War"],            correct: 1 },
  { id: 127, mode: "adult", category: "Pop Culture",  question: "Who wrote the Harry Potter series?",                                       options: ["Suzanne Collins","Philip Pullman","J.K. Rowling","Roald Dahl"], correct: 2 },
  { id: 128, mode: "adult", category: "Pop Culture",  question: "What is the name of Tony Stark's AI assistant in Iron Man?",              options: ["Cortana","JARVIS","HAL","Friday"],                         correct: 1 },
  { id: 129, mode: "adult", category: "Language",     question: "What is a word that reads the same forwards and backwards?",              options: ["Anagram","Palindrome","Homonym","Oxymoron"],               correct: 1 },
  { id: 130, mode: "adult", category: "Language",     question: "How many letters are in the Greek alphabet?",                              options: ["22","24","26","28"],                                       correct: 1 },
  { id: 131, mode: "adult", category: "Language",     question: "What language has the most native speakers in the world?",                options: ["English","Spanish","Hindi","Mandarin Chinese"],            correct: 3 },
  { id: 132, mode: "adult", category: "Language",     question: "The word 'robot' comes from which language?",                             options: ["German","Polish","Czech","Russian"],                       correct: 2 },
  { id: 133, mode: "adult", category: "Language",     question: "What is the fear of spiders called?",                                     options: ["Acrophobia","Arachnophobia","Claustrophobia","Entomophobia"], correct: 1 },
  { id: 134, mode: "adult", category: "Math",         question: "What is the value of Pi to two decimal places?",                          options: ["3.12","3.14","3.16","3.18"],                               correct: 1 },
  { id: 135, mode: "adult", category: "Math",         question: "What is the square root of 144?",                                         options: ["11","12","13","14"],                                       correct: 1 },
  { id: 136, mode: "adult", category: "Math",         question: "In binary, what does '1010' equal in decimal?",                           options: ["8","9","10","11"],                                         correct: 2 },
  { id: 137, mode: "adult", category: "Math",         question: "A prime number is only divisible by:",                                    options: ["Itself and 2","Only itself","Itself and 1","Any odd number"], correct: 2 },
  { id: 138, mode: "adult", category: "Arts",         question: "Who painted the Sistine Chapel ceiling?",                                  options: ["Leonardo da Vinci","Raphael","Michelangelo","Botticelli"], correct: 2 },
  { id: 139, mode: "adult", category: "Arts",         question: "Which Shakespeare play features the character Iago?",                     options: ["Hamlet","Macbeth","Othello","King Lear"],                  correct: 2 },
  { id: 140, mode: "adult", category: "Arts",         question: "The novel '1984' was written by:",                                        options: ["Aldous Huxley","George Orwell","Ray Bradbury","H.G. Wells"], correct: 1 },
  { id: 141, mode: "adult", category: "Arts",         question: "Beethoven composed his 9th Symphony while he was:",                       options: ["Blind","Deaf","Mute","Paralysed"],                         correct: 1 },
  { id: 142, mode: "adult", category: "Arts",         question: "What term describes a film made without spoken dialogue?",                options: ["B-movie","Silent film","Noir","Docudrama"],               correct: 1 },
  { id: 143, mode: "adult", category: "Science",      question: "What is the most abundant gas in Earth's atmosphere?",                     options: ["Oxygen","Argon","Nitrogen","Carbon dioxide"],              correct: 2 },
  { id: 144, mode: "adult", category: "Science",      question: "Which subatomic particle carries a negative charge?",                      options: ["Proton","Neutron","Electron","Quark"],                      correct: 2 },
  { id: 145, mode: "adult", category: "Science",      question: "Known as the 'powerhouse of the cell', this organelle is:",               options: ["Nucleus","Ribosome","Mitochondrion","Golgi apparatus"],    correct: 2 },
  { id: 146, mode: "adult", category: "Science",      question: "Which blood type is considered the universal donor?",                      options: ["A+","B-","AB+","O-"],                                       correct: 3 },
  { id: 147, mode: "adult", category: "Science",      question: "What is the chemical formula for table salt?",                             options: ["NaCl","KCl","NaOH","MgCl₂"],                               correct: 0 },
  { id: 148, mode: "adult", category: "History",      question: "Who was the first President of the United States?",                        options: ["Abraham Lincoln","George Washington","Thomas Jefferson","John Adams"], correct: 1 },
  { id: 149, mode: "adult", category: "History",      question: "Which pharaoh built the Great Pyramid at Giza?",                          options: ["Ramesses II","Tutankhamun","Khufu","Cleopatra"],            correct: 2 },
  { id: 150, mode: "adult", category: "History",      question: "The French Revolution began in which year?",                               options: ["1776","1789","1799","1804"],                                correct: 1 },
  { id: 151, mode: "adult", category: "History",      question: "Who co-wrote 'The Communist Manifesto' with Karl Marx?",                  options: ["Lenin","Trotsky","Friedrich Engels","Bakunin"],             correct: 2 },
  { id: 152, mode: "adult", category: "History",      question: "The Trojan War in Greek mythology ended with:",                            options: ["A peace treaty","The Trojan Horse","Achilles' death","A great flood"], correct: 1 },
  { id: 153, mode: "adult", category: "Geography",    question: "What is the capital of Japan?",                                           options: ["Osaka","Kyoto","Hiroshima","Tokyo"],                        correct: 3 },
  { id: 154, mode: "adult", category: "Geography",    question: "Which country has the largest total area?",                               options: ["Canada","China","USA","Russia"],                            correct: 3 },
  { id: 155, mode: "adult", category: "Geography",    question: "What is the capital city of Brazil?",                                     options: ["São Paulo","Rio de Janeiro","Brasília","Belo Horizonte"],   correct: 2 },
  { id: 156, mode: "adult", category: "Pop Culture",  question: "In Game of Thrones, what is Jon Snow's true Targaryen name?",             options: ["Rhaegar","Aegon","Jaehaerys","Viserys"],                    correct: 1 },
  { id: 157, mode: "adult", category: "Pop Culture",  question: "Who sang 'Bohemian Rhapsody'?",                                           options: ["The Rolling Stones","David Bowie","Queen","Led Zeppelin"],  correct: 2 },
  { id: 158, mode: "adult", category: "Pop Culture",  question: "In The Matrix, which pill does Neo choose?",                              options: ["Blue","Red","Green","White"],                               correct: 1 },
  { id: 159, mode: "adult", category: "Math",         question: "What is 15% of 200?",                                                     options: ["25","30","35","40"],                                        correct: 1 },
  { id: 160, mode: "adult", category: "Math",         question: "A triangle has angles of 60° and 80°. What is the third angle?",          options: ["30°","40°","50°","60°"],                                    correct: 1 },
  { id: 161, mode: "adult", category: "Math",         question: "What is the square root of 225?",                                         options: ["13","14","15","16"],                                        correct: 2 },
  { id: 162, mode: "adult", category: "Arts",         question: "Who wrote 'Pride and Prejudice'?",                                        options: ["Charlotte Brontë","Jane Austen","George Eliot","Mary Shelley"], correct: 1 },
  { id: 163, mode: "adult", category: "Arts",         question: "In music, what does 'forte' mean?",                                       options: ["Slow","Fast","Loud","Soft"],                                correct: 2 },
  { id: 164, mode: "adult", category: "Arts",         question: "Who painted 'The Starry Night'?",                                         options: ["Picasso","Monet","Van Gogh","Dalí"],                        correct: 2 },
  { id: 165, mode: "adult", category: "Language",     question: "An 'oxymoron' is:",                                                       options: ["A repeated sound","A self-contradicting phrase","A type of metaphor","A borrowed word"], correct: 1 },
];

const HE_KIDS_QUESTIONS: Question[] = [
  { id: 201, mode: "kids", category: "בעלי חיים", emoji: "🐱", question: "כמה רגליים יש לחתול?",                      options: ["2","4","6","8"],                                          correct: 1 },
  { id: 202, mode: "kids", category: "בעלי חיים", emoji: "🐘", question: "מי הכי גדול מביניהם?",                      options: ["אריה","פיל","סוס","קוף"],                                 correct: 1 },
  { id: 203, mode: "kids", category: "בעלי חיים", emoji: "🐮", question: "מה נותנת לנו הפרה?",                        options: ["ביצים","חלב","דבש","צמר"],                                correct: 1 },
  { id: 204, mode: "kids", category: "בעלי חיים", emoji: "🐟", question: "איפה גרים דגים?",                           options: ["ביבשה","בשמיים","במים","בעצים"],                          correct: 2 },
  { id: 205, mode: "kids", category: "בעלי חיים", emoji: "🐝", question: "מה מייצרות הדבורים?",                       options: ["חלב","דבש","גבינה","שמן"],                                correct: 1 },
  { id: 206, mode: "kids", category: "בעלי חיים", emoji: "🦋", question: "מה היה הפרפר לפני שנהיה פרפר?",            options: ["דבורה","תולעת","זחל","יתוש"],                             correct: 2 },
  { id: 207, mode: "kids", category: "בעלי חיים", emoji: "🐙", question: "כמה זרועות יש לתמנון?",                    options: ["4","6","8","10"],                                          correct: 2 },
  { id: 208, mode: "kids", category: "טבע",       emoji: "🌈", question: "כמה צבעים יש בקשת בענן?",                  options: ["5","6","7","8"],                                          correct: 2 },
  { id: 209, mode: "kids", category: "טבע",       emoji: "☀️", question: "מה גדול יותר — שמש או ירח?",              options: ["ירח","שמש","שווים","כוכב"],                               correct: 1 },
  { id: 210, mode: "kids", category: "אוכל",      emoji: "🍌", question: "איזה פרי הוא צהוב וארוך?",                 options: ["תפוח","בננה","תות","ענב"],                                correct: 1 },
  { id: 211, mode: "kids", category: "אוכל",      emoji: "🥕", question: "מה הצבע של גזר?",                          options: ["אדום","כתום","צהוב","ירוק"],                              correct: 1 },
  { id: 212, mode: "kids", category: "אוכל",      emoji: "🍦", question: "ממה עושים גלידה?",                         options: ["מיץ","חלב","מים","שמן"],                                  correct: 1 },
  { id: 213, mode: "kids", category: "מספרים",    emoji: "📅", question: "כמה ימים יש בשבוע?",                       options: ["5","6","7","8"],                                          correct: 2 },
  { id: 214, mode: "kids", category: "מספרים",    emoji: "🔺", question: "כמה צלעות יש למשולש?",                     options: ["2","3","4","5"],                                          correct: 1 },
  { id: 215, mode: "kids", category: "מספרים",    emoji: "🕔", question: "השעה ארבע. אחרי שעתיים — מה השעה?",        options: ["חמש","שש","שבע","שמונה"],                                 correct: 1 },
  { id: 216, mode: "kids", category: "ישראל",     emoji: "🇮🇱", question: "מהי בירת ישראל?",                         options: ["תל אביב","ירושלים","חיפה","אילת"],                        correct: 1 },
  { id: 217, mode: "kids", category: "ישראל",     emoji: "🕯️", question: "כמה נרות יש בחנוכייה (עם השמש)?",        options: ["7","8","9","10"],                                          correct: 2 },
  { id: 218, mode: "kids", category: "עולם",      emoji: "🗼", question: "מאיזה עיר מגדל אייפל?",                   options: ["לונדון","רומא","פריז","ברלין"],                            correct: 2 },
  { id: 219, mode: "kids", category: "גוף",       emoji: "❤️", question: "איפה נמצא הלב?",                          options: ["בבטן","בחזה","בראש","ביד"],                               correct: 1 },
  { id: 220, mode: "kids", category: "גוף",       emoji: "👀", question: "בעזרת מה אנחנו רואים?",                   options: ["אוזניים","אף","עיניים","ידיים"],                          correct: 2 },
  { id: 221, mode: "kids", category: "בעלי חיים", emoji: "🐶", question: "מה עושה כלב שרואה זר?",                   options: ["מייאו","נובח","נוחר","שורק"],                              correct: 1 },
  { id: 222, mode: "kids", category: "בעלי חיים", emoji: "🐟", question: "לאיזה בעל חיים יש קשקשים?",               options: ["צב","דג","תמנון","צפרדע"],                                correct: 1 },
  { id: 223, mode: "kids", category: "בעלי חיים", emoji: "🥚", question: "מה הוא 'הבית' של אפרוח לפני שנולד?",      options: ["קן","ביצה","מחילה","שקית"],                               correct: 1 },
  { id: 224, mode: "kids", category: "בעלי חיים", emoji: "🦁", question: "איך מצליח האריה?",                        options: ["נובח","מייאו","גועה","שואג"],                              correct: 3 },
  { id: 225, mode: "kids", category: "בעלי חיים", emoji: "🐧", question: "איזה ציפור לא יכולה לעוף?",               options: ["עורב","פינגווין","יונה","נשר"],                            correct: 1 },
  { id: 226, mode: "kids", category: "טבע",       emoji: "❄️", question: "מה יורד מהשמיים בחורף בארצות קרות?",     options: ["חול","שלג","עלים","דשא"],                                 correct: 1 },
  { id: 227, mode: "kids", category: "טבע",       emoji: "🌱", question: "מה צמחים צריכים כדי לגדול?",              options: ["רק מים","רק אור","מים, אור ואוויר","רק אדמה"],           correct: 2 },
  { id: 228, mode: "kids", category: "טבע",       emoji: "🌊", question: "מהו האוקיינוס הגדול ביותר?",              options: ["אטלנטי","הודי","ארקטי","פסיפי"],                          correct: 3 },
  { id: 229, mode: "kids", category: "ספורט",     emoji: "⚽", question: "כמה שחקנים יש בקבוצת כדורגל?",           options: ["9","10","11","12"],                                        correct: 2 },
  { id: 230, mode: "kids", category: "ספורט",     emoji: "🏊", question: "כמה מטר יש בבריכה אולימפית?",             options: ["25","50","75","100"],                                      correct: 1 },
  { id: 231, mode: "kids", category: "מספרים",    emoji: "✖️", question: "3 כפול 4 שווה כמה?",                      options: ["10","12","14","16"],                                       correct: 1 },
  { id: 232, mode: "kids", category: "מספרים",    emoji: "🔢", question: "כמה אפסים יש במספר 100?",                 options: ["1","2","3","4"],                                           correct: 1 },
  { id: 233, mode: "kids", category: "מספרים",    emoji: "📐", question: "כמה צלעות יש לריבוע?",                   options: ["3","4","5","6"],                                           correct: 1 },
  { id: 234, mode: "kids", category: "מספרים",    emoji: "🔢", question: "כמה שניות יש בדקה?",                      options: ["30","60","90","120"],                                      correct: 1 },
  { id: 235, mode: "kids", category: "ישראל",     emoji: "🕎", question: "כמה שבטים היו לעם ישראל?",               options: ["10","11","12","13"],                                       correct: 2 },
  { id: 236, mode: "kids", category: "ישראל",     emoji: "🌺", question: "מה הפרח הלאומי של ישראל?",               options: ["ורד","חמנייה","כלנית","נרקיס"],                            correct: 2 },
  { id: 237, mode: "kids", category: "ישראל",     emoji: "🏖️", question: "על איזה ים נמצאת אילת?",                 options: ["הים התיכון","ים סוף","ים המלח","הכינרת"],                 correct: 1 },
  { id: 238, mode: "kids", category: "גוף",       emoji: "🖐️", question: "כמה אצבעות יש בשתי ידיים יחד?",          options: ["8","9","10","12"],                                         correct: 2 },
  { id: 239, mode: "kids", category: "גוף",       emoji: "🦷", question: "מתי כדאי לצחצח שיניים?",                 options: ["פעם בשבוע","פעם ביום","פעמיים ביום","אחת לחודש"],        correct: 2 },
  { id: 240, mode: "kids", category: "צבעים",     emoji: "🎨", question: "אדום + כחול = ?",                         options: ["ירוק","כתום","סגול","חום"],                                correct: 2 },
  { id: 241, mode: "kids", category: "צבעים",     emoji: "🎨", question: "כחול + צהוב = ?",                         options: ["סגול","ירוק","כתום","אפור"],                               correct: 1 },
  { id: 242, mode: "kids", category: "אוכל",      emoji: "🍕", question: "מאיזו מדינה מגיע הפיצה?",                options: ["ישראל","ארה\"ב","איטליה","יוון"],                          correct: 2 },
  { id: 243, mode: "kids", category: "אוכל",      emoji: "🍫", question: "ממה עושים שוקולד?",                       options: ["פולי קפה","פולי קקאו","חיטה","סוכר"],                     correct: 1 },
  { id: 244, mode: "kids", category: "מוזיקה",    emoji: "🎸", question: "כמה מיתרים יש לגיטרה רגילה?",            options: ["4","5","6","8"],                                           correct: 2 },
  { id: 245, mode: "kids", category: "חלל",       emoji: "🌙", question: "מה שם הלוויין הטבעי של כדור הארץ?",      options: ["מאדים","הירח","שבתאי","נוגה"],                             correct: 1 },
  { id: 246, mode: "kids", category: "חלל",       emoji: "⭐", question: "כמה כוכבי לכת יש במערכת השמש?",           options: ["6","7","8","9"],                                           correct: 2 },
  { id: 247, mode: "kids", category: "חלל",       emoji: "🪐", question: "לאיזה כוכב לכת יש טבעות ענק?",           options: ["מאדים","שבתאי","צדק","נפטון"],                             correct: 1 },
  { id: 248, mode: "kids", category: "סיפורים",   emoji: "👸", question: "מי האנשים הקטנים שפגשה שלגייה?",         options: ["אלפים","ננסים","פיות","טרולים"],                           correct: 1 },
  { id: 249, mode: "kids", category: "סיפורים",   emoji: "🧞", question: "בסינדרלה — מה הייתה לה בחצות הלילה?",   options: ["כלום","עוד שמלה","הקסם נגמר","נסיך חדש"],                correct: 2 },
  { id: 250, mode: "kids", category: "עולם",      emoji: "🗽", question: "מה שם הפסל המפורסם בניו יורק?",          options: ["מגדל אייפל","פסל החירות","מצודת לונדון","שער ניצחון"],   correct: 1 },
  { id: 251, mode: "kids", category: "עולם",      emoji: "🇦🇺", question: "מה החיה המפורסמת של אוסטרליה?",        options: ["פיל","קנגורו","דב","ג'ירפה"],                              correct: 1 },
  { id: 252, mode: "kids", category: "עולם",      emoji: "🏔️", question: "מהו ההר הגבוה ביותר בעולם?",            options: ["K2","מון בלאן","אוורסט","קילימנג'רו"],                    correct: 2 },
  { id: 253, mode: "kids", category: "כללי",      emoji: "🚦", question: "מה צבע האור שאומר 'עצור' ברמזור?",       options: ["ירוק","צהוב","כחול","אדום"],                               correct: 3 },
  { id: 254, mode: "kids", category: "כללי",      emoji: "🧩", question: "כמה צבעים יש בקובייה הרובנית?",          options: ["4","5","6","7"],                                           correct: 2 },
  { id: 255, mode: "kids", category: "כללי",      emoji: "📅", question: "כמה חודשים יש בשנה?",                    options: ["10","11","12","13"],                                       correct: 2 },
];

const HE_ADULT_QUESTIONS: Question[] = [
  { id: 301, mode: "adult", category: "מדע",        question: "מה הסמל הכימי של זהב?",                                   options: ["Go","Gd","Au","Ag"],                                       correct: 2 },
  { id: 302, mode: "adult", category: "מדע",        question: "כמה עצמות יש בגוף האדם הבוגר?",                          options: ["186","206","226","246"],                                   correct: 1 },
  { id: 303, mode: "adult", category: "מדע",        question: "מהו כוכב הלכת הגדול ביותר במערכת השמש?",                 options: ["שבתאי","צדק","מאדים","אורנוס"],                           correct: 1 },
  { id: 304, mode: "adult", category: "מדע",        question: "מה הגז שצמחים סופגים בפוטוסינתזה?",                      options: ["חמצן","חנקן","פחמן דו-חמצני","מימן"],                    correct: 2 },
  { id: 305, mode: "adult", category: "מדע",        question: "מהי מהירות האור בקירוב (ק\"מ לשנייה)?",                  options: ["200,000","300,000","400,000","150,000"],                   correct: 1 },
  { id: 306, mode: "adult", category: "מדע",        question: "מהי החומר הקשה ביותר בטבע?",                             options: ["טיטניום","קוורץ","יהלום","קורונדום"],                     correct: 2 },
  { id: 307, mode: "adult", category: "היסטוריה",   question: "באיזה שנה הוקמה מדינת ישראל?",                           options: ["1946","1947","1948","1949"],                               correct: 2 },
  { id: 308, mode: "adult", category: "היסטוריה",   question: "מי היה ראש הממשלה הראשון של ישראל?",                     options: ["מנחם בגין","משה שרת","דוד בן-גוריון","לוי אשכול"],      correct: 2 },
  { id: 309, mode: "adult", category: "היסטוריה",   question: "באיזה שנה הסתיימה מלחמת העולם השנייה?",                  options: ["1943","1944","1945","1946"],                               correct: 2 },
  { id: 310, mode: "adult", category: "היסטוריה",   question: "הרנסנס החל באיזה מדינה?",                                options: ["צרפת","יוון","איטליה","ספרד"],                            correct: 2 },
  { id: 311, mode: "adult", category: "גיאוגרפיה",  question: "מהי בירת אוסטרליה?",                                     options: ["סידני","מלבורן","בריסבן","קנברה"],                        correct: 3 },
  { id: 312, mode: "adult", category: "גיאוגרפיה",  question: "מהו הנהר הארוך ביותר באפריקה?",                          options: ["קונגו","ניז'ר","זמבזי","נילוס"],                          correct: 3 },
  { id: 313, mode: "adult", category: "גיאוגרפיה",  question: "איזו מדינה היא הקטנה בעולם?",                            options: ["מונקו","ליכטנשטיין","סן מרינו","הוותיקן"],              correct: 3 },
  { id: 314, mode: "adult", category: "גיאוגרפיה",  question: "מהו הים שממזרח לישראל?",                                 options: ["הים התיכון","ים סוף","ים המלח","הכינרת"],                correct: 2 },
  { id: 315, mode: "adult", category: "תרבות",      question: "מי צייר את 'מונה ליזה'?",                                options: ["מיכלאנג'לו","רפאל","לאונרדו דה וינצ'י","בוטיצ'לי"],   correct: 2 },
  { id: 316, mode: "adult", category: "תרבות",      question: "מי כתב את סדרת 'הארי פוטר'?",                            options: ["סוזן קולינס","פיליפ פולמן","ג'יי קיי רולינג","רואלד דאל"], correct: 2 },
  { id: 317, mode: "adult", category: "תרבות",      question: "באיזה שנה יצא האייפון הראשון?",                          options: ["2005","2006","2007","2008"],                               correct: 2 },
  { id: 318, mode: "adult", category: "מתמטיקה",   question: "מהו ערך פאי לשתי ספרות עשרוניות?",                       options: ["3.12","3.14","3.16","3.18"],                               correct: 1 },
  { id: 319, mode: "adult", category: "שפה",        question: "כמה אותיות יש באלפבית העברי?",                           options: ["20","22","24","26"],                                       correct: 1 },
  { id: 320, mode: "adult", category: "שפה",        question: "מהו פלינדרום?",                                          options: ["מילה שנקראת אותו דבר קדימה ואחורה","מילה נרדפת","קיצור","ניב"], correct: 0 },
  { id: 321, mode: "adult", category: "מדע",        question: "מהי הנוסחה הכימית של מים?",                               options: ["CO₂","H₂O","NaCl","O₂"],                                  correct: 1 },
  { id: 322, mode: "adult", category: "מדע",        question: "מהו הגז הנפוץ ביותר באטמוספרה של כדור הארץ?",            options: ["חמצן","ארגון","חנקן","פחמן דו-חמצני"],                    correct: 2 },
  { id: 323, mode: "adult", category: "מדע",        question: "איזה חלקיק תת-אטומי נושא מטען שלילי?",                   options: ["פרוטון","נייטרון","אלקטרון","קווארק"],                    correct: 2 },
  { id: 324, mode: "adult", category: "מדע",        question: "מה תפקיד המיטוכונדריה בתא?",                              options: ["גרעין התא","ייצור אנרגיה","ממברנת התא","סינתזת חלבון"],  correct: 1 },
  { id: 325, mode: "adult", category: "מדע",        question: "מהו סוג הדם הנחשב 'תורם אוניברסלי'?",                   options: ["A+","B-","AB+","O-"],                                      correct: 3 },
  { id: 326, mode: "adult", category: "היסטוריה",   question: "מי חתם על הכרזת העצמאות של ישראל ב-1948?",              options: ["בן-גוריון","בגין","רבין","שרת"],                          correct: 0 },
  { id: 327, mode: "adult", category: "היסטוריה",   question: "המהפכה הצרפתית פרצה בשנת:",                              options: ["1776","1789","1799","1812"],                               correct: 1 },
  { id: 328, mode: "adult", category: "היסטוריה",   question: "מי היה הקיסר הרומי הראשון?",                             options: ["יוליוס קיסר","אוגוסטוס","נרון","מרקוס אורליוס"],         correct: 1 },
  { id: 329, mode: "adult", category: "היסטוריה",   question: "מי הוביל את בריטניה במלחמת העולם השנייה?",               options: ["אנטוני אידן","ממלין","וינסטון צ'רצ'יל","נוויל צ'מברלן"], correct: 2 },
  { id: 330, mode: "adult", category: "היסטוריה",   question: "מלחמת ששת הימים הייתה בשנת:",                            options: ["1948","1956","1967","1973"],                               correct: 2 },
  { id: 331, mode: "adult", category: "גיאוגרפיה",  question: "מהו הנהר הארוך ביותר בעולם?",                            options: ["האמזונס","המיסיסיפי","הנילוס","היאנגטזה"],               correct: 2 },
  { id: 332, mode: "adult", category: "גיאוגרפיה",  question: "לאיזו מדינה יש קו החוף הארוך ביותר בעולם?",             options: ["רוסיה","אוסטרליה","קנדה","נורבגיה"],                      correct: 2 },
  { id: 333, mode: "adult", category: "גיאוגרפיה",  question: "מהי הכי גבוהה ההר בישראל?",                              options: ["הרמון","הכרמל","הנגב","המצדה"],                           correct: 0 },
  { id: 334, mode: "adult", category: "גיאוגרפיה",  question: "מהי בירת ברזיל?",                                         options: ["סאו פאולו","ריו דה ז'נרו","ברזיליה","בלו הוריזונטה"],    correct: 2 },
  { id: 335, mode: "adult", category: "תרבות",      question: "מי חיבר את הסימפוניה התשיעית כשהיה חירש?",              options: ["מוצרט","שופן","בטהובן","באך"],                            correct: 2 },
  { id: 336, mode: "adult", category: "תרבות",      question: "מי כתב 'מלחמה ושלום'?",                                  options: ["דוסטויבסקי","טולסטוי","צ'כוב","גוגול"],                  correct: 1 },
  { id: 337, mode: "adult", category: "תרבות",      question: "מי צייר את 'כוכבי הלילה' (The Starry Night)?",           options: ["פיקסו","מונה","ון גוך","דאלי"],                           correct: 2 },
  { id: 338, mode: "adult", category: "תרבות",      question: "באיזו שנה יצא סרט 'מלחמת הכוכבים' המקורי?",              options: ["1975","1977","1979","1981"],                               correct: 1 },
  { id: 339, mode: "adult", category: "תרבות",      question: "מי כתב את 'הדין והעונש'?",                                options: ["טולסטוי","גורקי","דוסטויבסקי","צ'כוב"],                  correct: 2 },
  { id: 340, mode: "adult", category: "מתמטיקה",   question: "מה שורש ריבועי של 225?",                                  options: ["13","14","15","16"],                                       correct: 2 },
  { id: 341, mode: "adult", category: "מתמטיקה",   question: "כמה ספרות ראשוניות יש מתחת ל-20?",                        options: ["6","7","8","9"],                                           correct: 2 },
  { id: 342, mode: "adult", category: "מתמטיקה",   question: "מה הערך של 2 בחזקת 10?",                                  options: ["512","1024","2048","256"],                                 correct: 1 },
  { id: 343, mode: "adult", category: "שפה",        question: "כמה אותיות סופיות יש באלפבית העברי?",                    options: ["3","4","5","6"],                                           correct: 2 },
  { id: 344, mode: "adult", category: "שפה",        question: "מי כתב את ה'תקווה' — ההמנון הישראלי?",                  options: ["הרצל","נפתלי הרץ אימבר","ביאליק","אחד העם"],             correct: 1 },
  { id: 345, mode: "adult", category: "טכנולוגיה",  question: "מי ממייסדי חברת אפל?",                                   options: ["ביל גייטס","מארק צוקרברג","סטיב ג'ובס","אילון מאסק"],   correct: 2 },
  { id: 346, mode: "adult", category: "טכנולוגיה",  question: "מה ה-AI?",                                                options: ["בינה מלאכותית","אינטרנט מתקדם","תוכנת ניהול","מחשב על"], correct: 0 },
  { id: 347, mode: "adult", category: "כלכלה",      question: "מה פירוש ה-GDP?",                                         options: ["מדד לאושר","תוצר מקומי גולמי","מדד לאינפלציה","מדד לתעסוקה"], correct: 1 },
  { id: 348, mode: "adult", category: "כלכלה",      question: "מה זו 'בורסה'?",                                          options: ["בנק מרכזי","שוק מניות","משרד אוצר","קרן פנסיה"],         correct: 1 },
  { id: 349, mode: "adult", category: "ספורט",      question: "כמה קבוצות השתתפו בגביע העולם בכדורגל 2022?",            options: ["24","32","36","48"],                                       correct: 1 },
  { id: 350, mode: "adult", category: "ספורט",      question: "מאיזו מדינה מגיע הקריקט?",                                options: ["אוסטרליה","הודו","אנגליה","דרום אפריקה"],                 correct: 2 },
  { id: 351, mode: "adult", category: "מדע",        question: "מה זה DNA?",                                              options: ["חומצה דאוקסיריבונוקלאית","חלבון גרעיני","שומן גנטי","קולגן"], correct: 0 },
  { id: 352, mode: "adult", category: "היסטוריה",   question: "הקולוסיאום ברומא נבנה בעיקר בשביל:",                     options: ["קרבות גלדיאטורים","תיאטרון","שוק","טקסים דתיים"],         correct: 0 },
  { id: 353, mode: "adult", category: "גיאוגרפיה",  question: "מהי בירת יפן?",                                           options: ["אוסקה","קיוטו","הירושימה","טוקיו"],                        correct: 3 },
  { id: 354, mode: "adult", category: "מדע",        question: "מה הסמל הכימי של ברזל?",                                  options: ["Fe","Ir","In","Fr"],                                       correct: 0 },
  { id: 355, mode: "adult", category: "כללי",       question: "כמה מדינות יש בעולם בקירוב?",                             options: ["100","150","195","250"],                                   correct: 2 },
];

const QUESTIONS_PER_GAME = 10;
const TIMER_SECONDS = 15;

// ── Helpers ────────────────────────────────────────────────────────────────────
function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function TriviaGame({ title }: { title: string }) {
  const [lang, setLang]                 = useState<"en" | "he">("en");
  const [phase, setPhase]               = useState<Phase>("idle");
  const [mode, setMode]                 = useState<Mode>("kids");
  const [questions, setQuestions]       = useState<Question[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selected, setSelected]         = useState<number | null>(null);
  const [answered, setAnswered]         = useState(false);
  const [score, setScore]               = useState(0);
  const [streak, setStreak]             = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [timeLeft, setTimeLeft]         = useState(TIMER_SECONDS);

  const highScore        = useRef(0);
  const tickTimeoutRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deadlineRef      = useRef<number>(0);
  const modeRef          = useRef<Mode>("kids");
  const langRef          = useRef<"en" | "he">("en");
  const scoreRef         = useRef(0);
  const streakRef        = useRef(0);
  const correctRef       = useRef(0);

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { langRef.current = lang; }, [lang]);

  // ── Timer ─────────────────────────────────────────────────────────────────
  const stopTimer = useCallback(() => {
    if (tickTimeoutRef.current) { clearTimeout(tickTimeoutRef.current); tickTimeoutRef.current = null; }
  }, []);

  const handleAnswer = useCallback((idx: number | null, tLeft: number) => {
    stopTimer();
    const q = questions[questionIndex];
    if (!q) return;

    const isCorrect = idx === q.correct;
    setSelected(idx);
    setAnswered(true);

    if (isCorrect) {
      const timeBonus = modeRef.current === "adult" ? Math.floor(tLeft * 10) : 0;
      const mul = streakRef.current >= 5 ? 2 : streakRef.current >= 3 ? 1.5 : 1;
      const pts = Math.round((100 + timeBonus) * mul);
      scoreRef.current += pts;
      streakRef.current += 1;
      correctRef.current += 1;
      setScore(scoreRef.current);
      setStreak(streakRef.current);
      setCorrectCount(correctRef.current);
    } else {
      streakRef.current = 0;
      setStreak(0);
    }
  }, [questions, questionIndex, stopTimer]);

  const scheduleTick = useCallback(() => {
    tickTimeoutRef.current = setTimeout(() => {
      const remaining = Math.max(0, deadlineRef.current - Date.now());
      const tLeft = remaining / 1000;
      setTimeLeft(tLeft);
      if (remaining <= 0) {
        handleAnswer(null, 0);
      } else {
        scheduleTick();
      }
    }, 100);
  }, [handleAnswer]);

  const startTimer = useCallback(() => {
    deadlineRef.current = Date.now() + TIMER_SECONDS * 1000;
    setTimeLeft(TIMER_SECONDS);
    scheduleTick();
  }, [scheduleTick]);

  // ── Advance question ───────────────────────────────────────────────────────
  const advanceQuestion = useCallback(() => {
    setSelected(null);
    setAnswered(false);
    setQuestionIndex(qi => {
      const next = qi + 1;
      if (next >= QUESTIONS_PER_GAME) {
        highScore.current = Math.max(highScore.current, scoreRef.current);
        setPhase("over");
      } else {
        if (modeRef.current === "adult") startTimer();
      }
      return next;
    });
  }, [startTimer]);

  // Schedule advance after feedback pause
  useEffect(() => {
    if (!answered) return;
    const delay = modeRef.current === "kids" ? 1500 : 1000;
    advanceTimeoutRef.current = setTimeout(advanceQuestion, delay);
    return () => { if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current); };
  }, [answered, advanceQuestion]);

  // ── Game controls ─────────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    stopTimer();
    if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
    const pool = modeRef.current === "kids"
      ? (langRef.current === "he" ? HE_KIDS_QUESTIONS : KIDS_QUESTIONS)
      : (langRef.current === "he" ? HE_ADULT_QUESTIONS : ADULT_QUESTIONS);
    const picked = shuffleArray(pool).slice(0, QUESTIONS_PER_GAME);
    scoreRef.current  = 0;
    streakRef.current = 0;
    correctRef.current = 0;
    setQuestions(picked);
    setQuestionIndex(0);
    setSelected(null);
    setAnswered(false);
    setScore(0);
    setStreak(0);
    setCorrectCount(0);
    setTimeLeft(TIMER_SECONDS);
    setPhase("playing");
    if (modeRef.current === "adult") {
      // Timer starts after state settles
      setTimeout(() => startTimer(), 50);
    }
  }, [stopTimer, startTimer]);

  const resetGame = useCallback(() => {
    stopTimer();
    if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
    setPhase("idle");
  }, [stopTimer]);

  // Cleanup on unmount
  useEffect(() => () => {
    stopTimer();
    if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
  }, [stopTimer]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const currentQ   = questions[questionIndex];
  const isNewHigh  = phase === "over" && scoreRef.current > 0 && scoreRef.current >= highScore.current;
  const streakMul  = streak >= 5 ? 2 : streak >= 3 ? 1.5 : 1;
  const timerPct   = (timeLeft / TIMER_SECONDS) * 100;
  const timerColor = timeLeft < 4 ? "#ef4444" : timeLeft < 8 ? "#f59e0b" : "var(--accent-primary)";

  const getButtonStyle = (idx: number): React.CSSProperties => {
    const base: React.CSSProperties = {
      padding: "0.875rem 0.75rem",
      minHeight: 60,
      border: "2px solid var(--border-color)",
      borderRadius: "var(--radius-sm)",
      background: "var(--bg-tertiary)",
      color: "var(--text-primary)",
      fontSize: "0.9rem",
      fontWeight: 500,
      cursor: answered ? "default" : "pointer",
      pointerEvents: answered ? "none" : "auto",
      textAlign: "left",
      lineHeight: 1.3,
      transition: "all 0.15s ease",
      width: "100%",
    };
    if (!answered) return base;
    if (idx === currentQ?.correct) {
      return { ...base, background: "#1a4a1a", borderColor: "#4caf50", color: "#a5d6a7",
        animation: "tr-correct-pulse 0.6s ease-out" };
    }
    if (idx === selected) {
      return { ...base, background: "#4a1a1a", borderColor: "#e53935", color: "#ef9a9a",
        animation: "tr-wrong-shake 0.4s ease-out" };
    }
    return { ...base, opacity: 0.45 };
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={styles.gameInner}>
      <style>{KEYFRAMES}</style>
      <h3 className={styles.gameTitle}>{title}</h3>

      {/* Lang + Mode selector */}
      <div className={styles.difficultySelector}>
        {(["en", "he"] as const).map(l => (
          <button key={l}
            className={`${styles.diffBtn} ${lang === l ? styles.activeDiff : ""}`}
            onClick={() => { setLang(l); resetGame(); }}>
            {l === "en" ? "🇺🇸 EN" : "🇮🇱 עב"}
          </button>
        ))}
        <span style={{ margin: "0 0.25rem", color: "var(--text-muted)" }}>|</span>
        {(["kids", "adult"] as Mode[]).map(m => (
          <button key={m}
            className={`${styles.diffBtn} ${mode === m ? styles.activeDiff : ""}`}
            onClick={() => { setMode(m); resetGame(); }}>
            {m === "kids" ? "Kids 🖼️" : "Adult 🧠"}
          </button>
        ))}
      </div>

      {/* ── IDLE ────────────────────────────────────────────────────────── */}
      {phase === "idle" && (
        <div style={{ textAlign: "center", padding: "2rem 0" }}>
          <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>
            {mode === "kids" ? "🖼️" : "🧠"}
          </div>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.75, marginBottom: "0.75rem" }}>
            {mode === "kids"
              ? "Answer 10 picture questions! Each one has a fun emoji clue."
              : "10 trivia questions across science, history, geography & more. Answer fast for bonus points!"}
          </p>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginBottom: "1.25rem" }}>
            {mode === "kids"
              ? "No time limit · 100 pts per correct answer · Streak bonus ×1.5/×2"
              : "15 seconds per question · Time bonus up to +150 pts · Streak bonus ×1.5/×2"}
          </p>
          {highScore.current > 0 && (
            <div style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginBottom: "1rem" }}>
              Best: <strong style={{ color: "var(--accent-primary)" }}>{highScore.current} pts</strong>
            </div>
          )}
          <button className={styles.resetBtn} onClick={startGame}>Start!</button>
        </div>
      )}

      {/* ── PLAYING ─────────────────────────────────────────────────────── */}
      {phase === "playing" && currentQ && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>

          {/* HUD row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            {/* Streak badge */}
            <div style={{ minWidth: 80 }}>
              {streak >= 3 && (
                <div key={streak} style={{
                  display: "inline-flex", alignItems: "center", gap: "0.3rem",
                  background: streak >= 5 ? "#ef4444" : "#f59e0b",
                  color: "#fff", borderRadius: "var(--radius-sm)",
                  padding: "0.2rem 0.55rem", fontWeight: 800, fontSize: "0.78rem",
                  animation: "tr-streak-pop 0.3s ease-out",
                  whiteSpace: "nowrap",
                }}>
                  🔥 ×{streakMul} Streak!
                </div>
              )}
            </div>
            {/* Score */}
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--accent-primary)", lineHeight: 1 }}>{score}</div>
              <div style={{ fontSize: "0.62rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>pts</div>
            </div>
            {/* Progress */}
            <div style={{ textAlign: "right", minWidth: 80 }}>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                {Math.min(questionIndex + 1, QUESTIONS_PER_GAME)} / {QUESTIONS_PER_GAME}
              </div>
              <div style={{ display: "flex", gap: 3, justifyContent: "flex-end", marginTop: 2 }}>
                {Array.from({ length: QUESTIONS_PER_GAME }).map((_, i) => (
                  <div key={i} style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: i < questionIndex
                      ? "var(--text-secondary)"
                      : i === questionIndex
                      ? "var(--accent-primary)"
                      : "var(--border-color)",
                    transition: "background 0.2s",
                  }} />
                ))}
              </div>
            </div>
          </div>

          {/* Timer bar (adult only) */}
          {mode === "adult" && (
            <div style={{ height: 8, background: "var(--bg-tertiary)", borderRadius: 4, overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${timerPct}%`,
                background: timerColor,
                borderRadius: 4,
                transition: "width 100ms linear, background-color 0.3s",
                animation: timeLeft < 4 ? "tr-timer-pulse 0.5s ease-in-out infinite" : undefined,
              }} />
            </div>
          )}

          {/* Question card */}
          <div
            key={currentQ.id}
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-color)",
              borderRadius: "var(--radius-md)",
              padding: "1.25rem 1rem",
              animation: "tr-fade-slide 0.3s ease-out",
            }}
          >
            {/* Emoji picture (kids) */}
            {mode === "kids" && currentQ.emoji && (
              <div style={{
                fontSize: "4rem",
                lineHeight: 1.2,
                letterSpacing: "0.2rem",
                textAlign: "center",
                marginBottom: "0.75rem",
              }}>
                {currentQ.emoji}
              </div>
            )}
            {/* Category tag (adult) */}
            {mode === "adult" && (
              <div style={{ fontSize: "0.68rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5rem" }}>
                {currentQ.category}
              </div>
            )}
            <p style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.5, margin: 0, direction: lang === "he" ? "rtl" : "ltr", textAlign: lang === "he" ? "right" : "left" }}>
              {currentQ.question}
            </p>
          </div>

          {/* Answer grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
            {currentQ.options.map((opt, idx) => (
              <button
                key={idx}
                style={{ ...getButtonStyle(idx), direction: lang === "he" ? "rtl" : "ltr", textAlign: lang === "he" ? "right" : "left" }}
                onClick={() => !answered && handleAnswer(idx, timeLeft)}
              >
                <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-secondary)", marginRight: lang === "he" ? 0 : "0.35rem", marginLeft: lang === "he" ? "0.35rem" : 0 }}>
                  {["A","B","C","D"][idx]}
                </span>
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── OVER ────────────────────────────────────────────────────────── */}
      {phase === "over" && (
        <div style={{ textAlign: "center", padding: "2rem 0" }}>
          <div style={{ fontSize: "3rem", marginBottom: "0.4rem" }}>
            {correctCount >= 9 ? "🏆" : correctCount >= 7 ? "🎉" : correctCount >= 5 ? "🙂" : "😅"}
          </div>
          <div style={{ fontSize: "1.1rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
            {isNewHigh ? "New high score!" : `${correctCount} / ${QUESTIONS_PER_GAME} correct`}
          </div>
          <div style={{ fontSize: "3.5rem", fontWeight: 800, color: "var(--accent-primary)", lineHeight: 1, marginBottom: "0.2rem" }}>
            {score}
          </div>
          <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "0.25rem" }}>
            points
          </div>
          {!isNewHigh && highScore.current > 0 && (
            <div style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginBottom: "1rem" }}>
              Best: <strong style={{ color: "var(--accent-primary)" }}>{highScore.current}</strong>
            </div>
          )}
          {isNewHigh && (
            <div style={{ color: "var(--accent-primary)", fontSize: "0.82rem", marginBottom: "1rem", fontWeight: 700 }}>
              🏆 New Best!
            </div>
          )}
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
            <button className={styles.resetBtn} onClick={startGame}>Play Again</button>
            <button
              onClick={resetGame}
              style={{
                background: "transparent",
                border: "1px solid var(--border-color)",
                color: "var(--text-secondary)",
                padding: "0.5rem 1.25rem",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                fontSize: "0.85rem",
              }}
            >
              Change Mode
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
