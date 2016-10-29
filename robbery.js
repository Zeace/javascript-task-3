'use strict';

exports.isStar = true;
var DAYS = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];
var timeForWork = {
    mon: [{ 'dateFrom': new Date(2016, 9, 24), 'dateTo': new Date(2016, 9, 24) }],
    tue: [{ 'dateFrom': new Date(2016, 9, 25), 'dateTo': new Date(2016, 9, 25) }],
    wed: [{ 'dateFrom': new Date(2016, 9, 26), 'dateTo': new Date(2016, 9, 26) }]
};
var goodTime = [];

exports.getAppropriateMoment = function ah(schedule, duration, workingHours) {
    if (duration <= 0) {
        goodTime = false;
    } else {
        goodTime = normalizeMinAndHour(findTime(schedule, duration, workingHours));
    }

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
            template = template.replace(/(%DD)/g, goodTime[2]);
            template = template.replace(/(%HH)/g, goodTime[3]);
            template = template.replace(/(%MM)/g, goodTime[4]);

            return template;
        },

        tryLater: function () {
            if (!this.exists()) {

                return false;
            }
            if (getTimeLater(duration * 60000)) {

                return true;
            }

            return false;
        }
    };
};

function findTime(schedule, duration, workingHours) {
    if (goodTime.length === 5) {
        timeForWork = {
            mon: [{ 'dateFrom': new Date(2016, 9, 24), 'dateTo': new Date(2016, 9, 24) }],
            tue: [{ 'dateFrom': new Date(2016, 9, 25), 'dateTo': new Date(2016, 9, 25) }],
            wed: [{ 'dateFrom': new Date(2016, 9, 26), 'dateTo': new Date(2016, 9, 26) }]
        };
        goodTime = [];
    }
    if (typeof(goodTime) === 'object' && goodTime.length === 0) {
        if (workingHours.from === '' || !isValidBTime(workingHours)) {

            return false;
        }
        if (!addBankTime(workingHours)) {

            return false;
        }
        addSheduleTime(schedule, workingHours);
    }

    return getTime(duration * 60000);
}

function isValidBTime(workingHours) {
    if (workingHours.to === '' || isValidOneTime(workingHours.to.split(':'))) {

        return false;
    }
    if (workingHours.from === '' || isValidOneTime(workingHours.from.split(':'))) {

        return false;
    }

    return true;
}

function isValidOneTime(time) {
    var timeZone = parseInt(time[1].split('+')[1]);
    time[0] = parseInt(time[0]);
    time[1] = parseInt(time[1].split('+')[0]);
    if (time[0] < 0 || time[0] > 23 || time[1] < 0 || time[1] > 59 || timeZone > 24) {

        return true;
    }

    return false;
}

function getTimeZone(workingHours) {
    var timeZoneBank = workingHours.from !== undefined ? Number(workingHours.from
        .split('+')[1]) : 0;

    return timeZoneBank;
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
    addBankDays(dateArray);

    return true;
}

function addBankDays(dateArray) {
    timeForWork.mon[0].dateFrom = dateArray[0];
    timeForWork.mon[0].dateTo = dateArray[3];
    timeForWork.tue[0].dateFrom = dateArray[1];
    timeForWork.tue[0].dateTo = dateArray[4];
    timeForWork.wed[0].dateFrom = dateArray[2];
    timeForWork.wed[0].dateTo = dateArray[5];
}

function addSheduleTime(schedule, workingHours) {
    var keys = [];
    for (var key in schedule) {
        if ({}.hasOwnProperty.call(schedule, key)) {
            keys.push(key);
        }
    }
    for (var j = 0; j < keys.length; j++) {
        for (var i = 0; i < schedule[keys[j]].length; i++) {
            correctionSchedule(schedule[keys[j]][i], getTimeZone(workingHours));
            changeTimeForWork(schedule[keys[j]][i].from, schedule[keys[j]][i].to);
        }
    }

    return true;
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

function changeTimeForWork(from, to) {
    if (from.getTime() === to.getTime() || from > to) {

        return false;
    }
    for (var key in timeForWork) {
        if (!({}.hasOwnProperty.call(timeForWork, key))) {
            return false;
        }
        for (var i = 0; i < timeForWork[key].length; i++) {
            calculateTime(from, to, key, i);
        }
    }

    return true;
}

function calculateTime(from, to, key, i) {
    var set = 0;
    var dateFrom = timeForWork[key][i].dateFrom;
    var dateTo = timeForWork[key][i].dateTo;
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
        changeTime(key, -2, dateFrom);

        return true;
    }
    if (set !== 0) {
        changeTime(key, i, newTime, set);
    }
}

function changeTime(key, i, newTime, set) {
    if (i === -2) {
        timeForWork[key].splice(0, timeForWork[key].length);
        timeForWork[key].push({ 'dateFrom': newTime, 'dateTo': newTime });

        return true;
    }
    timeForWork[key].splice(i, 1);
    for (var j = set; j > 0; j--) {
        timeForWork[key].splice(i, 0, newTime[j - 1]);
    }

    return true;
}

function getTime(duration) {
    for (var key in timeForWork) {
        if (!({}.hasOwnProperty.call(timeForWork, key))) {

            return false;
        }

        if (calculateGetTime(key, duration)) {

            return calculateGetTime(key, duration);
        }

    }

    return false;
}
function calculateGetTime(key, duration) {

    for (var i = 0; i < timeForWork[key].length; i++) {
        if ((timeForWork[key][i].dateTo - timeForWork[key][i].dateFrom) >= duration) {
            var inform = [key, i];
            inform.push(DAYS[timeForWork[key][i].dateTo.getDay() - 1]);
            var time = [timeForWork[key][i].dateFrom.getHours()];
            time.push(timeForWork[key][i].dateFrom.getMinutes());
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
    var normalArray = [array[0], array[1], array[2]];
    if (array[3] < 10) {
        normalArray.push('0' + array[3]);
    } else {
        normalArray.push(array[3]);
    }
    if (array[4] < 10) {
        normalArray.push('0' + array[4]);
    } else {
        normalArray.push(array[4]);
    }

    return normalArray;
}

function getTimeLater(duration) {
    if (typeof(goodTime) === 'boolean' || goodTime.length !== 5) {

        return false;
    }
    var dateForCheck = timeForWork[goodTime[0]][goodTime[1]].dateFrom;
    transferLate(dateForCheck, goodTime[0], goodTime[1]);
    timeForWork[goodTime[0]][goodTime[1]].dateFrom.setMinutes(dateForCheck.getMinutes() + 30);
    if (getTime(duration) === false) {
        timeForWork[goodTime[0]][goodTime[1]].dateFrom = dateForCheck;

        return false;
    }
    goodTime = normalizeMinAndHour(getTime(duration));

    return getTime(duration);
}

function transferLate(dateForCheck, day, num) {
    var a = dateForCheck;
    var b = new Date(a);
    b.setMinutes(b.getMinutes() + 30);
    if (timeForWork[day][num + 1] !== undefined && b > timeForWork[day][num + 1].dateFrom) {
        addBusyLate(day, (num + 1), b.valueOf());
    }
    if (a.getDay() !== b.getDay()) {
        addBusyLate(getKey(b.getDay()), 0, b.valueOf());
    }

    return a;
}

function getKey(day) {
    switch (day) {
        case 2:

            return 'tue';
        case 3:

            return 'wed';
        default:

            return 0;
    }
}

function addBusyLate(day, num, value) {
    if (timeForWork[day][num].dateFrom.valueOf() < value) {
        timeForWork[day][num].dateFrom = new Date(value);
    }
}
