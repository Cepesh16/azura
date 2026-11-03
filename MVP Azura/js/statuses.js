// statuses.js

// Change this one line when switching metrics:
// export const statusProgress = state => state.totalCompleted;
// Later: export const statusProgress = state => state.learnedCount;


// statuses.js

// Russian language
// AGE
export const ageThresholds = [
    { threshold: 0, status: 'новорожденный' },
    { threshold: 1, status: 'младенец' },
    { threshold: 2, status: 'малыш' },
    { threshold: 4, status: 'ребенок' },
    { threshold: 6, status: 'ученик' },
    { threshold: 9, status: 'подросток' },
    { threshold: 13, status: 'молодой человек' },
    { threshold: 14, status: 'первокурсник' },
    { threshold: 15, status: 'второкурсник' },
    { threshold: 16, status: 'третьекурсник' },
    { threshold: 17, status: 'выпускник' },
    { threshold: 19, status: 'взрослый' },
];

// EDUCATION
export const educationThresholds = [
    { threshold: 0, status: 'не образован' },
    { threshold: 3, status: 'домашнее обучение' },
    { threshold: 5, status: 'детский сад' },
    { threshold: 6, status: 'начальная школа' },
    { threshold: 8, status: 'средняя школа' },
    { threshold: 10, status: 'старшая школа' },
    { threshold: 13, status: 'академический отпуск' }, // или 'перерыв в учебе'
    { threshold: 14, status: 'колледж' },
    { threshold: 16, status: 'университет' },
    { threshold: 18, status: 'выпускник вуза' },
];

// INCOME
export const incomeThresholds = [
    { threshold: 0, status: 'иждивенец' }, // или 'на содержании'
    { threshold: 5, status: 'дармоед' },    // точный перевод freeloader (или 'бездельник')
    { threshold: 7, status: 'карманные деньги' },
    { threshold: 9, status: 'уборка по дому' },
    { threshold: 12, status: 'подработка' },
    { threshold: 16, status: 'стажер' },
    { threshold: 20, status: 'трудоустроен' },
];


// English language

// // AGE
// export const ageThresholds = [
//     { threshold: 0, status: 'newborn' },
//     { threshold: 1, status: 'baby' },
//     { threshold: 2, status: 'toddler' },
//     { threshold: 4, status: 'child' },
//     { threshold: 6, status: 'student' },
//     { threshold: 9, status: 'teenager' },
//     { threshold: 13, status: 'young adult' },
//     { threshold: 14, status: 'freshman' },
//     { threshold: 15, status: 'sophomore' },
//     { threshold: 16, status: 'junior' },
//     { threshold: 17, status: 'senior' },
//     { threshold: 19, status: 'adult' },
// ];

// // EDUCATION
// export const educationThresholds = [
//     { threshold: 0, status: 'none' },
//     { threshold: 3, status: 'homeschooling' },
//     { threshold: 5, status: 'kindergarten' },
//     { threshold: 6, status: 'primary school' },
//     { threshold: 8, status: 'middle school' },
//     { threshold: 10, status: 'high school' },
//     { threshold: 13, status: 'gap-year' },
//     { threshold: 14, status: 'college' },
//     { threshold: 16, status: 'university' },
//     { threshold: 18, status: 'graduate' },
// ];

// // INCOME
// export const incomeThresholds = [
//     { threshold: 0, status: 'dependent' },
//     { threshold: 5, status: 'freeloader' },
//     { threshold: 7, status: 'allowance' },
//     { threshold: 9, status: 'paid-chores' },
//     { threshold: 12, status: 'part-time job' },
//     { threshold: 16, status: 'intern' },
//     { threshold: 20, status: 'employed' },
// ];

// GET CURRENT STATUS
export function getStatus(thresholds, progress) {
    let currentStatus = thresholds[0].status;

    for (const item of thresholds) {
        if (progress >= item.threshold) {
            currentStatus = item.status;
        } else {
            break;
        }
    }

    return currentStatus;
}
