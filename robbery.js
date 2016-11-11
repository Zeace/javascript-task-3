'use strict';

exports.isStar = true;
var DAYS = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];
var TRANSFER_TIME = 30;
var ONE_MINUTE = 60000;
var DAY_FOR_ROBBERY = 3;

/**
 * @param {Object} schedule – Расписание Банды
 * @param {Number} duration - Время на ограбление в минутах
 * @param {Object} workingHours – Время работы банка
 * @returns {Object}
 */
exports.getAppropriateMoment = function (schedule, duration, workingHours) {
    console.info(schedule, duration, workingHours);
    var timeForWork = findTime(schedule, workingHours);
    var goodTime = normalizeMinAndHour(getTime(duration * ONE_MINUTE, timeForWork));

    return {

        /**
         * Найдено ли время
         * @returns {Boolean}
         */
        exists: function () {

            return typeof (goodTime) === 'object';
        },

        /**
         * Возвращает отформатированную строку с часами для ограбления
         * Например,
         *   "Начинаем в %HH:%MM (%DD)" -> "Начинаем в 14:59 (СР)"
         * @param {String} template
         * @returns {String}
         */
        format: function (template) {
            if (!this.exists()) {

                return '';
            }
            if (typeof(goodTime) !== 'object' || duration === 0 || !template) {

                return '';
            }
            template = template.replace(/(%DD)/g, goodTime[1])
                .replace(/(%HH)/g, goodTime[2])
                .replace(/(%MM)/g, goodTime[3]);

            return template;
        },

        /**
         * Попробовать найти часы для ограбления позже [*]
         * @star
         * @returns {Boolean}
         */
        tryLater: function () {
            var oldGoodTime = goodTime;
            if (!this.exists()) {

                return false;
            }
            if ((goodTime = getTimeLater(duration * ONE_MINUTE, timeForWork, goodTime))) {

                return true;
            }
            goodTime = oldGoodTime;

            return false;
        }
    };
};

/**
 * Поиск подходящего времени
 * @param {Object} schedule – Расписание Банды
 * @param {Object} workingHours – Время работы банка
 * @returns {Object}
 */
function findTime(schedule, workingHours) {
    var workSchedule = addBankTime(workingHours);

    return addSheduleTime(schedule, workingHours, workSchedule);
}

/**
 * Поиск подходящего времени
 * @param {Object} workingHours – Время работы банка
 * @returns {Object} bankSchedule - Время работы банка в допустимые дни
 */
function addBankTime(workingHours) {
    var bankSchedule = [];
    var intOpenHour = parseInt(workingHours.from.split(':')[0], 10);
    var intOpenMinute = parseInt(workingHours.from.split(':')[1][0], 10);
    var intCloseHour = parseInt(workingHours.to.split(':')[0], 10);
    var intCloseMinute = parseInt(workingHours.to.split(':')[1].split('+')[0], 10);
    var from = 0;
    var to = 0;
    for (var i = 0; i < DAY_FOR_ROBBERY; i++) {

        // числа 9 и 24 взяты как ближайшая дата понедельника на момент написания
        from = new Date(2016, 9, (i + 24), intOpenHour, intOpenMinute);
        to = new Date(2016, 9, (i + 24), intCloseHour, intCloseMinute);
        if (from > to || !getTimeZone(workingHours)) {

            return false;
        }
        bankSchedule.push({ 'dateFrom': from, 'dateTo': to });
    }

    return bankSchedule;
}

/**
 * Получение часового пояса банка
 * @param {Object} workingHours – Время работы банка
 * @returns {Number} timeZoneBank - часовой пояс юанка
 */
function getTimeZone(workingHours) {
    var timeZone = Number(workingHours.from.split('+')[1]);
    var timeZoneBank = workingHours.from !== undefined ? timeZone : 0;

    return timeZoneBank;
}

/**
 * Получение всех отрезов времени, когда возможно ограбление
 * @param {Object} schedule – Расписание Банды
 * @param {Object} workingHours – Время работы банка
 * @param {Object} oldWorkSchedule - Расписание банка в доступные дни
 * @returns {Object} workSchedule - Все отрезки свободного времени в часы работы банка
 */
function addSheduleTime(schedule, workingHours, oldWorkSchedule) {
    var workSchedule = oldWorkSchedule;
    var keys = Object.keys(schedule);
    keys.forEach(function (keyValue) {
        schedule[keyValue].forEach(function (interval) {
            correctionSchedule(interval, getTimeZone(workingHours));
            changeTimeForWork(interval.from, interval.to, workSchedule);
        });
    });

    return workSchedule;
}

/**
 * Приведение отрезка свободного времени к часовому поясу банка
 * @param {Object} interval – Отрезок свободного времени члена банды
 * @param {Number} timeZone – Часовой пояс банка
 * @returns {Boolean}
 */
function correctionSchedule(interval, timeZone) {
    for (var key in interval) {
        if (typeof(interval[key]) === 'object' || !timeZone || parseInt(interval[key]
                .split('+')[1], 10) > 24) {
            return false;
        }
        var day = getDay(interval[key].substr(0, 2));
        var menTimeZone = parseInt(interval[key].split('+')[1], 10);
        var corrective = timeZone - menTimeZone;
        var hour = parseInt(interval[key].substr(3, 2), 10) + corrective;
        var minute = parseInt(interval[key].substr(6, 2), 10);
        interval[key] = new Date (2016, 9, day, hour, minute);
    }

    return true;
}

/**
 * Получение всех отрезов времени, когда возможно ограбление
 * @param {String} string – День недели в двубуквенном формате
 * @returns {Number} - дата, совпадающая с днём недели
 */
function getDay(string) {
    switch (string) {
        case 'ПН':
            return 24;
        case 'ВТ':
            return 25;
        case 'СР':
            return 26;
        case 'ЧТ':
            return 27;
        default:
            return 38;
    }
}

/**
 * Обрезка доступных отрезков свободного времени
 * @param {Date} from – Начало отрезка занятости
 * @param {Date} to – Конец отрезка занятости
 * @param {Object} workSchedule - Текущее расписание свободного времени
 * @returns {Boolean}
 */
function changeTimeForWork(from, to, workSchedule) {
    if (from.getTime() === to.getTime() || from > to) {

        return false;
    }
    for (var i = 0; i < workSchedule.length; i++) {
        calculateTime(from, to, i, workSchedule);
    }

    return true;
}

/**
 * Обрезка доступных отрезков свободного времени
 * @param {Date} from – Начало отрезка занятости
 * @param {Date} to – Конец отрезка занятости
 * @param {Number} intervalNum - номер редактируемого отрезка
 * @param {Object} workSchedule - Текущее расписание свободного времени
 */
function calculateTime(from, to, intervalNum, workSchedule) {
    var set = 0;
    var dateFrom = workSchedule[intervalNum].dateFrom;
    var dateTo = workSchedule[intervalNum].dateTo;
    var newTime = [];
    if (from >= dateFrom && from <= dateTo) {
        newTime.push({ 'dateFrom': dateFrom, 'dateTo': from });
        set++;
    }
    if (to <= dateTo && to >= dateFrom) {
        newTime.push({ 'dateFrom': to, 'dateTo': dateTo });
        set++;
    }
    if (to > dateTo && from < dateFrom) {
        changeTime(-1, dateFrom, set, workSchedule);

        return;
    }
    if (set !== 0) {
        changeTime(intervalNum, newTime, set, workSchedule);
    }
}

/**
 * Изменение отрезков в расписании на новые
 * @param {Number} intervalNum - номер редактируемого отрезка,
 * передаётся -1 в случае, когда отрезок разбивается на 2, а не отсекается край
 * @param {Array} newTime – новый отрезок
 * @param {Number} set – количество редактируемых отрезков
 * @param {Object} workSchedule - Текущее расписание свободного времени
 */
function changeTime(intervalNum, newTime, set, workSchedule) {
    if (intervalNum === -1) {
        workSchedule.splice(0, workSchedule.length);
        workSchedule.push({ 'dateFrom': newTime, 'dateTo': newTime });

        return;
    }
    workSchedule.splice(intervalNum, 1);
    for (var j = set; j > 0; j--) {
        workSchedule.splice(intervalNum, 0, newTime[j - 1]);
    }

    return;
}

/**
 * Поиск подходящего времени для ограбления
 * @param {Number} duration - Время, необходимое на ограбление
 * @param {Object} workSchedule - Текущее расписание подходящего времени
 * @returns {Array} inform - Точка времени, подхадящая для ограбления
 */
function getTime(duration, workSchedule) {
    if (!workSchedule) {

        return false;
    }
    for (var i = 0; i < workSchedule.length; i++) {
        if ((workSchedule[i].dateTo - workSchedule[i].dateFrom) >= duration) {
            var inform = [i];
            inform.push(DAYS[workSchedule[i].dateTo.getDay() - 1]);
            var time = [workSchedule[i].dateFrom.getHours()];
            time.push(workSchedule[i].dateFrom.getMinutes());
            inform.push(time[0], time[1]);

            return inform;
        }
    }

    return false;
}

/**
 * Приведение часов и минут к двуциферному формату, например: 05
 * @param {Array} array - Массив, содержащий точку времени для ограбления
 * @returns {Array}  - Массив, приведённый к тербуему формату
 */
function normalizeMinAndHour(array) {
    if (array === false) {
        return false;
    }
    var normalArray = [array[0], array[1]];
    if (array[2] < 10) {
        normalArray.push('0' + array[2]);
    } else {
        normalArray.push(array[2]);
    }
    if (array[3] < 10) {
        normalArray.push('0' + array[3]);
    } else {
        normalArray.push(array[3]);
    }

    return normalArray;
}

/**
 * Поиск подходящего времени для ограбления
 * @param {Number} duration - Время, необходимое на ограбление
 * @param {Object} timeForWork - Текущее расписание подходящего времени
 * @param {Array} goodTime - Точка времени, подхадящая для ограбления
 * @returns {Array} - В случае успешного нахождения - новая точка времени для ограбления
 */
function getTimeLater(duration, timeForWork, goodTime) {
    if (typeof goodTime === 'undefined' || goodTime.length !== 4) {

        return false;
    }
    var dateForCheck = timeForWork[goodTime[0]].dateFrom;
    var scheduleToTry = transferLate(dateForCheck, goodTime[0], timeForWork);
    if (getTime(duration, scheduleToTry) === false) {
        timeForWork[goodTime[0]].dateFrom = dateForCheck;

        return false;
    }

    return normalizeMinAndHour(getTime(duration, scheduleToTry));
}

/**
 * Поиск подходящего времени для ограбления
 * @param {Date} dateForCheck - Точка времени, подхадящая для ограбления
 * @param {Number} num - Номер отрезка для обрезания
 * @param {Object} timeForWork - Текущее расписание подходящего времени
 * @returns {Object} - Расписание, обрезанное на заданное время переноса если нашлось
 * новое время, либо старое расписание
 */
function transferLate(dateForCheck, num, timeForWork) {
    var a = dateForCheck;
    var b = new Date(a);
    b.setMinutes(b.getMinutes() + TRANSFER_TIME);

    // проверка следующего свободного отрезка времени для ограбления
    if (timeForWork[num + 1] !== undefined && b > timeForWork[num + 1].dateFrom) {
        return addBusyLate((num + 1), b.valueOf(), timeForWork);
    }
    timeForWork[num].dateFrom = b;

    return timeForWork;
}

/**
 * Поиск подходящего времени для ограбления
 * @param {Number} num - Номер отрезка для обрезания
 * @param {Number} value - Точка времени для ограбления, после переноса в мс
 * @param {Object} timeForWork - Текущее расписание подходящего времени
 * @returns {Object} Расписание, обрезанное на заданное время переноса
 */
function addBusyLate(num, value, timeForWork) {
    if (timeForWork[num].dateFrom.valueOf() < value) {
        timeForWork[num].dateFrom = new Date(value);
    }

    return timeForWork;
}
