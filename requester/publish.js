const Jcal = require('../msg');
const config = require("../config.json");

//Some parameters for the AMQP connection
const topic = 'add';
var channel;

//Connection to the AMQP queue
var amqp = require('amqplib');

/**
 * Send PUBLISH jCalendar objects to a AMQP compatible queue
 * @param {JSON} jcal JCalendar object prepared
 * @param {string} dest Recipient and attendant of the event
 * @param {string} method Kind of event to process
 */
function sendToCua(jcal, dest, method){
    amqp.connect(config.CUADM).then((ch) => {
        return ch.createChannel();
    }).then((ch) => {
        ch.assertQueue(topic);
        let msg;
        switch(method){
            case 'event':
                jcal.setVeventParam(0, 'attendee', dest);
                msg = JSON.stringify(jcal.toJson());
                break;
        }
        const message = {
            recipient: dest,
            event: msg
        };
        ch.sendToQueue(topic, Buffer.from(JSON.stringify(message)));
        switch(method){
            case 'event':
                jcal.setVeventParam(0, 'attendee', '');
                break;
        }
        //ch.close();
    }).catch(console.error);
}

/**
 * Lauches the mail sender for each attendant in the ATTENDANTS list
 * @param {string} method Kind of event to process
 * @param {Array} req Required parameters for the event above
 * @param {Object} opt Optional parameters for the event above
 * @param {Array} dest Attendants of the event processed
 */
function jMailer(method, req, opt, dest){
    let jcal = new Jcal.Calendar(config.prodid, config.version);
    jcal.setMethod('add');
    switch(method){
        case 'event':
            if(jcal.addVevent(req) === false) return false;
            else {
                for(let i = 0; i < Object.keys(opt).length; i++){
                    jcal.setVeventParam(0, Object.keys(opt)[i], opt[Object.keys(opt)[i]]);
                }
                dest.forEach((elem) => {
                    sendToCua(jcal, elem, method);
                });
            }

    }
}

/**
 * Extracts data from the events prepared below
 * @param {JSON} jcal Original JCalendar object
 * @param {Array} events Array with the events prepared to send
 */
function sendPublish(jcal, events) {
    const evtP = jcal.listVeventParam();
    let required = [];
    let optional = {};
    for(let i = 0; i < events.vevent.length; i++){
        for(let j = 0; j < evtP.required.length; j++){
            required.push(events.vevent[i].event[evtP.required[j]]);
        }
        for(let j = 0; j < evtP.optional.length; j++){
            if(events[evtP.optional[j]])
                optional[evtP.optional[j]] = events.vevent[i].event[evtP.optional[j]];
        }
        jMailer('event', required, optional, events.vevent[i].asistentes);
    }
}

/**
 * Transforms the JCalendar VEVENT object to one prepared to send
 * @param {JSON} jcal JSON representing the JCalendar object
 * @return {Array} Array containing some VEVENT events
 */
function publishEvent(jcal) {
    var result = [];
    for(let i = 0; jcal.getVeventParam(i, 'uid'); i++){
        let asistentes = jcal.getVeventParam(i, 'attendee');
        if(asistentes) {
            asistentes = asistentes.split(',');
            jcal.setVeventParam(i, 'attendee', '');
            result.push({
                asistentes: asistentes,
                event: jcal.toJson().vcalendar.vevent[i]
            });
        }
    }
    return result;
}

/**
 * Transforms the JCalendar VFREEBUSY object to one prepared to send
 * @param {JSON} jcal JSON representing the JCalendar object
 * @return {Array} Array containing some VFREEBUSY events
 */
function publishFree(jcal) {
    let result = [];
    for(let i = 0; jcal.getVfreeParam(i, 'uid'); i++){
        let asistentes = jcal.getVfreeParam(i, 'attendee');
        if(asistentes) {
            asistentes = asistentes.split(',');
            jcal.setVfreeParam(i, 'attendee', '');
            result.push({
                asistentes: asistentes,
                event: jcal.toJson().vcalendar.vfreebusy[i]
            });
        }
    }
    return result;
}

/**
 * Transforms the JCalendar VTODO object to one prepared to send
 * @param {JSON} jcal JSON representing the JCalendar object
 * @return {Array} Array containing some VTODO events
 */
function publishTodo(jcal){
    let result = [];
    for(let i = 0; jcal.getVtodoParam(i, 'uid'); i++){
        let asistentes = jcal.getVtodoParam(i, 'attendee');
        if(asistentes) {
            asistentes = asistentes.split(',');
            jcal.setVtodoParam(i, 'attendee', '');
            result.push({
                asistentes: asistentes,
                event: jcal.toJson().vcalendar.vtodo[i]
            });
        }
    }
    return result;
}

/**
 * Transforms the JCalendar VJOURNAL object to one prepared to send
 * @param {JSON} jcal JSON representing the JCalendar object
 * @return {Array} Array containing some VJOURNAL events
 */
function publishJournal(jcal) {
    let result = [];
    for(let i = 0; jcal.getVjournalParam(i, 'uid'); i++){
        let asistentes = jcal.getVjournalParam(i, 'attendee');
        if(asistentes) {
            asistentes = asistentes.split(',');
            jcal.setVjournalParam(i, 'attendee', '');
            result.push({
                asistentes: asistentes,
                event: jcal.toJson().vcalendar.vtodo[i]
            });
        }
    }
    return result;
}

/**
 * Launcher for sending procedure
 * @param {JSON} calendar JSON representing the JCalendar object
 */
function adder(calendar) {
    let jcal = new Jcal.Calendar(null, 0);
    jcal.parseJSON(calendar);
    let cua = {};
    if(jcal.getVeventParam(0, 'uid')) cua.vevent = publishEvent(jcal);
    if(jcal.getVfreeParam(0, 'uid')) cua.vfreebusy = publishFree(jcal);
    if(jcal.getVtodoParam(0, 'uid')) cua.vtodo = publishTodo(jcal);
    if(jcal.getVjournalParam(0, 'uid')) cua.vjournal = publishJournal(jcal);
    sendPublish(jcal, cua);
}

module.exports.adder = adder;