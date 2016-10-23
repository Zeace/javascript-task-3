'use strict';

exports.isStar = true;
var timeForWork = {
    mon: [{ 'dateFrom': new Date(2016, 9, 24), 'dateTo': new Date(2016, 9, 24) }],
    tue: [{ 'dateFrom': new Date(2016, 9, 25), 'dateTo': new Date(2016, 9, 25) }],
    wed: [{ 'dateFrom': new Date(2016, 9, 26), 'dateTo': new Date(2016, 9, 26) }]
};
var goodTime = [];


exports.getAppropriateMoment = function (schedule, duration, workingHours) {
    console.info(schedule, duration, workingHours);
    goodTime = normalizeMinAndHour(findTime(schedule, duration, workingHours));

    return {

        exists: function () {

            return typeof (goodTime) === 'object';
        },


        format: function (template) {
            if (typeof(goodTime) !== 'object') {

                return false;
            }
            template = template.replace(/(%DD)/g, goodTime[2]);
            template = template.replace(/(%HH)/g, goodTime[3]);
            template = template.replace(/(%MM)/g, goodTime[4]);

            return template;
        },

        tryLater: function () {

            return getTimeLater(duration * 60000);
        }
    };
};

function findTime(schedule, duration, workingHours) {
    if (typeof(goodTime) === 'object') {
        addBankTime(workingHours);
    }
    addSheduleTime(schedule, workingHours);

    return getTime(duration * 60000);
}

function getTimeZone(workingHours) {
    var string = workingHours.from.toString();

    return string.charAt(string.length - 1);
}

function addBankTime(workingHours) {
    var open = workingHours.from.split(':');
    var close = workingHours.to.split(':');
    var dateArray = [];
    for (var i = 0; i < 3; i++) {
        var intHour = parseInt(close[0]);
        dateArray[i] = new Date(2016, 9, (i + 24), parseInt(open[0]), parseInt(open[1]));
        dateArray[i + 3] = new Date(2016, 9, (i + 24), intHour, parseInt(close[1].substr(0, 1)));
    }
    timeForWork.mon[0].dateFrom = dateArray[0];
    timeForWork.mon[0].dateTo = dateArray[3];
    timeForWork.tue[0].dateFrom = dateArray[1];
    timeForWork.tue[0].dateTo = dateArray[4];
    timeForWork.wed[0].dateFrom = dateArray[2];
    timeForWork.wed[0].dateTo = dateArray[5];

    return true;
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
        if (typeof(interval[key]) === 'object') {

            return false;
        }
        var day = getDay(interval[key].substr(0, 2));
        var corrective = timeZone - parseInt(interval[key].substr(9, 1), 10);
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
        default:

            return 27;
    }
}

function changeTimeForWork(from, to) {
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
    if ((from - dateFrom) > 0 && (from - dateFrom) < (dateTo - dateFrom)) {
        newTime.push({ 'dateFrom': dateFrom, 'dateTo': from });
        set++;
    }
    if ((dateTo - to) > 0 && (dateTo - to) < (dateTo - dateFrom)) {
        newTime.push({ 'dateFrom': to, 'dateTo': dateTo });
        set++;
    }
    if (set !== 0) {
        changeTime(key, i, newTime, set);
    }
}


function changeTime(key, i, newTime, set) {
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
            inform.push(switchDay(timeForWork[key][i].dateTo.getDay()));
            var time = [timeForWork[key][i].dateFrom.getHours()];
            time.push(timeForWork[key][i].dateFrom.getMinutes());
            inform.push(time[0], time[1]);

            return inform;
        }
    }

    return false;
}

function switchDay(day) {
    switch (day) {
        case 1:

            return 'ПН';
        case 2:

            return 'ВТ';
        case 3:

            return 'СР';
        default:

            return '';
    }

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
    var date = timeForWork[goodTime[0]][goodTime[1]].dateFrom;
    timeForWork[goodTime[0]][goodTime[1]].dateFrom.setMinutes(date.getMinutes() + 30);
    if (getTime(duration) === false) {
        timeForWork[goodTime[0]][goodTime[1]].dateFrom = date;

        return false;
    }
    goodTime = normalizeMinAndHour(getTime(duration));

    return getTime(duration);
}
