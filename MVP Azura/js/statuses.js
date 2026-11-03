// statuses.js

// Change this one line when switching metrics:
// export const statusProgress = state => state.totalCompleted;
// Later: export const statusProgress = state => state.learnedCount;


// statuses.js

// AGE
export const ageThresholds = [
    { threshold: 0, status: 'newborn' },
    { threshold: 1, status: 'baby' },
    { threshold: 2, status: 'toddler' },
    { threshold: 4, status: 'child' },
    { threshold: 6, status: 'student' },
    { threshold: 9, status: 'teenager' },
    { threshold: 13, status: 'young adult' },
    { threshold: 14, status: 'freshman' },
    { threshold: 15, status: 'sophomore' },
    { threshold: 16, status: 'junior' },
    { threshold: 17, status: 'senior' },
    { threshold: 19, status: 'adult' },
];

// EDUCATION
export const educationThresholds = [
    { threshold: 0, status: 'none' },
    { threshold: 3, status: 'homeschooling' },
    { threshold: 5, status: 'kindergarten' },
    { threshold: 6, status: 'primary school' },
    { threshold: 8, status: 'middle school' },
    { threshold: 10, status: 'high school' },
    { threshold: 13, status: 'gap-year' },
    { threshold: 14, status: 'college' },
    { threshold: 16, status: 'university' },
    { threshold: 18, status: 'graduate' },
];

// INCOME
export const incomeThresholds = [
    { threshold: 0, status: 'dependent' },
    { threshold: 5, status: 'freeloader' },
    { threshold: 7, status: 'allowance' },
    { threshold: 9, status: 'paid-chores' },
    { threshold: 12, status: 'part-time job' },
    { threshold: 16, status: 'intern' },
    { threshold: 20, status: 'employed' },
];

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
