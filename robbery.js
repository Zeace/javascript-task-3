'use strict';

exports.isStar = true;
var DAYS = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];

exports.getAppropriateMoment = function (schedule, duration, workingHours) {
    console.info(schedule, duration, workingHours);
    var timeForWork = findTime(schedule, workingHours, duration);

    var goodTime = normalizeMinAndHour(getTime(duration * 60000, timeForWork));

    return {

        exists: function () {

            return typeof (goodTime) === 'object';
        },

        format: function (template) {
            if (!this.exists()) {

                return '';
            }
            if (typeof(goodTime) !== 'object' || duration === 0 || !template) {

                return '';
            }
            template = template.replace(/(%DD)/g, goodTime[1]);
            template = template.replace(/(%HH)/g, goodTime[2]);
            template = template.replace(/(%MM)/g, goodTime[3]);

            return template;
        },

        tryLater: function () {
            var oldGoodTime = goodTime;
            if (!this.exists()) {

                return false;
            }
            if ((goodTime = getTimeLater(duration * 60000, timeForWork, goodTime))) {

                return true;
            }
            goodTime = oldGoodTime;

            return false;
        }
    };
};

function findTime(schedule, workingHours) {
    var workSchedule = addBankTime(workingHours);

    return addSheduleTime(schedule, workingHours, workSchedule);
}

function addBankTime(workingHours) {
    var open = workingHours.from.split(':');
    var close = workingHours.to.split(':');
    var dateArray = [];
    for (var i = 0; i < 3; i++) {
        var intHour = parseInt(close[0]);
        dateArray[i] = new Date(2016, 9, (i + 24), parseInt(open[0]), parseInt(open[1]));
        dateArray[i + 3] = new Date(2016, 9, (i + 24), intHour, parseInt(close[1].split('+')[0]));
        if (dateArray[i] > dateArray[i + 3] || !getTimeZone(workingHours)) {

            return false;
        }
    }

    return addBankDays(dateArray);
}

function getTimeZone(workingHours) {
    var timeZoneBank = workingHours.from !== undefined ? Number(workingHours.from
        .split('+')[1]) : 0;

    return timeZoneBank;
}

function addBankDays(dateArray) {
    var bankSchedule = [];
    for (var i = 0; i < 3; i++) {
        bankSchedule.push({ 'dateFrom': dateArray[i], 'dateTo': dateArray[i + 3] });
    }

    return bankSchedule;
}

function addSheduleTime(schedule, workingHours, oldWorkSchedule) {
    var workSchedule = oldWorkSchedule;
    var keys = [];
    for (var key in schedule) {
        if ({}.hasOwnProperty.call(schedule, key)) {
            keys.push(key);
        }
    }
    for (var j = 0; j < keys.length; j++) {
        for (var i = 0; i < schedule[keys[j]].length; i++) {
            correctionSchedule(schedule[keys[j]][i], getTimeZone(workingHours));
            changeTimeForWork(schedule[keys[j]][i].from, schedule[keys[j]][i].to, workSchedule);
        }
    }

    return workSchedule;
}

function correctionSchedule(interval, timeZone) {
    for (var key in interval) {
        if (typeof(interval[key]) === 'object' || !timeZone || parseInt(interval[key]
                .split('+')[1]) > 24) {

            return false;
        }
        var day = getDay(interval[key].substr(0, 2));
        var corrective = timeZone - parseInt(interval[key].split('+')[1], 10);
        var hour = parseInt(interval[key].substr(3, 2), 10) + corrective;
        interval[key] = new Date (2016, 9, day, hour, parseInt(interval[key].substr(6, 2), 10));

    }

    return true;
}

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

function changeTimeForWork(from, to, workSchedule) {
    if (from.getTime() === to.getTime() || from > to) {

        return false;
    }
    for (var i = 0; i < workSchedule.length; i++) {
        calculateTime(from, to, i, workSchedule);
    }

    return true;
}

function calculateTime(from, to, i, workSchedule) {
    var set = 0;
    var dateFrom = workSchedule[i].dateFrom;
    var dateTo = workSchedule[i].dateTo;
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
        changeTime(-2, dateFrom, workSchedule);

        return true;
    }
    if (set !== 0) {
        changeTime(i, newTime, set, workSchedule);
    }
}

function changeTime(i, newTime, set, workSchedule) {
    if (i === -2) {
        workSchedule.splice(0, workSchedule.length);
        workSchedule.push({ 'dateFrom': newTime, 'dateTo': newTime });

        return true;
    }
    workSchedule.splice(i, 1);
    for (var j = set; j > 0; j--) {
        workSchedule.splice(i, 0, newTime[j - 1]);
    }

    return true;
}

function getTime(duration, workSchedule) {
    if (typeof (workSchedule) === 'undefined') {

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

function transferLate(dateForCheck, num, timeForWork) {
    var a = dateForCheck;
    var b = new Date(a);
    b.setMinutes(b.getMinutes() + 30);
    if (timeForWork[num + 1] !== undefined && b > timeForWork[num + 1].dateFrom) {
        return addBusyLate((num + 1), b.valueOf(), timeForWork);
    }
    timeForWork[num].dateFrom = b;

    return timeForWork;
}

function addBusyLate(num, value, timeForWork) {
    if (timeForWork[num].dateFrom.valueOf() < value) {
        timeForWork[num].dateFrom = new Date(value);
    }

    return timeForWork;
}
