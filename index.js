const config = require("./config.json");
const token = config.BOT_TOKEN;
const mongoose = require("mongoose");
/*
const {
  register,
  confirmUser,
  isAuth,
  changeEmail
} = require("./authentication/controllers/register");

mongoose.connect(
  "mongodb://localhost/icalendar",
  { useNewUrlParser: true }
);

let email;
bot.onText(/\/register (.+)/, (msg, match) => {
  // TODO: Verify real email
  email = match[1];
  register(msg.from.id, email)
    .then(res => {
      bot.sendMessage(msg.chat.id, res);
    })
    .catch(err => {
      bot.sendMessage(msg.chat.id, err);
    });
});

bot.onText(/\/changemail (.+)/, (msg, match) => {
  // TODO: Verify real email
  email = match[1];
  changeEmail(msg.from.id, email)
    .then(res => {
      bot.sendMessage(msg.chat.id, res);
    })
    .catch(err => {
      bot.sendMessage(msg.chat.id, err);
    });
});

let confirmationToken;
bot.onText(/\/confirm (.+)/, (msg, match) => {
  confirmationToken = match[1];
  confirmUser(msg.from.id, confirmationToken)
    .then(res => {
      bot.sendMessage(msg.chat.id, res);
    })
    .catch(err => {
      bot.sendMessage(msg.chat.id, err);
    });
});

bot.onText(/\/prueba/, msg => {
  isAuth(msg.chat.id)
    .then(auth => {
      return bot.sendMessage(msg.chat.id, "Tu email es " + auth);
    })
    .catch(err => {
      return bot.sendMessage(msg.chat.id, err);
    });
});*/
const Calendar = require('./calendarUI/calendarUI');
const methods = require("./methods.js");
const Telegraf = require('telegraf')
const Composer = require('telegraf/composer')
const session = require('telegraf/session')
const Stage = require('telegraf/stage')
const Markup = require('telegraf/markup')
const WizardScene = require('telegraf/scenes/wizard')
const Router = require('telegraf/router')
const Extra = require('telegraf/extra')

const bot = new Telegraf(token);

bot.command("addevent", ctx => 
  {
    ctx.reply('Primero tenemos que comprobar que estas autenticado', Markup.inlineKeyboard([
      Markup.callbackButton('➡️ Autenticar', 'auth')
]).extra())
    bot.use(addEventStage.middleware())
  });

const stepTituloAddEventHandler = new Composer()
stepTituloAddEventHandler.use((ctx) => {
  ctx.scene.session.infoEvent[2] = ctx.message.text;
  ctx.replyWithMarkdown('El Título es:`' + ctx.message.text + '`', Markup.inlineKeyboard([
    Markup.callbackButton('➡️ Correcto', 'next')
]).extra())
  return ctx.wizard.next()
});

const calendarHandler = new Composer()
calendarHandler.action(/calendar-telegram-date-[\d-]+/g, ctx => {
    let date = ctx.match[0].replace("calendar-telegram-date-", "");
    ctx.scene.session.infoEvent[0] = date;
    ctx.replyWithMarkdown('La Fecha es:`' + date + '`', Markup.inlineKeyboard([
      Markup.callbackButton('➡️ Correcto', 'next')
  ]).extra())
    return ctx.wizard.next()
});

const hourPickerUI = Extra
  .HTML()
  .markup((m) => m.inlineKeyboard([
    m.callbackButton('1', 'hour:01'),
    m.callbackButton('2', 'hour:02'),
    m.callbackButton('3', 'hour:03'),
    m.callbackButton('4', 'hour:04'),
    m.callbackButton('5', 'hour:05'),
    m.callbackButton('6', 'hour:06'),
    m.callbackButton('7', 'hour:07'),
    m.callbackButton('8', 'hour:08'),
    m.callbackButton('9', 'hour:09'),
    m.callbackButton('10', 'hour:10'),
    m.callbackButton('11', 'hour:11'),
    m.callbackButton('12', 'hour:12'),
    m.callbackButton('AM', 'mode:AM'),
    m.callbackButton('PM', 'mode:PM'),
    m.callbackButton('00', 'min:00'),
    m.callbackButton('15', 'min:15'),
    m.callbackButton('30', 'min:30'),
    m.callbackButton('45', 'min:45'),
    m.callbackButton('Clear', 'clear'),
    m.callbackButton('Ok', 'ok')
], { columns: 3 }))

const hourPicker = new Router(({ callbackQuery }) => {
  if (!callbackQuery.data) {
    return
  }
  const parts = callbackQuery.data.split(':')
  return {
    route: parts[0],
    state: {
      value: parts[1]
    }
  }
})
calculator.on('hour', (ctx) => {
  ctx.scene.session.hour = ctx.state.value
  return editTime(ctx)
})
calculator.on('min', (ctx) => {
  ctx.scene.session.min = ctx.state.value
  return editTime(ctx)
})
calculator.on('mode', (ctx) => {
  ctx.scene.session.mode = ctx.state.value
  return editTime(ctx)
})
calculator.on('clear', (ctx) => {
  ctx.scene.session.hour = "08"
  ctx.scene.session.min = "00"
  ctx.scene.session.mode = "AM"
  return editTime(ctx)
})
calculator.on('ok', (ctx) => {
  if (ctx.scene.session.mode.match("PM")) {
    const hour = (parseInt(ctx.scene.session.hour, 10) || 0)
    hour += 12
    ctx.scene.session.hour = hour
  }
  ctx.scene.session.infoEvent[0] = ctx.scene.session.infoEvent[0]+ctx.scene.session.hour + ctx.scene.session.min + "00" + "Z"
  editTime(ctx)
  return ctx.wizard.next()
})

function editTime (ctx) {
  return ctx.editMessageText(`Tiempo: <b>${ctx.scene.session.hour}</b>:<b>${ctx.scene.session.min}</b> <b>${ctx.scene.session.mode}</b>`, hourPickerUI).catch(() => undefined)
}

const timeHandler = new Composer()
timeHandler.on('callback_query', hourPicker); 

const addEventWizard = new WizardScene('addevent-wizard',
(ctx) => {
  //Estructura de Event  ['dtstamp','dtstart','organizer','summary','uid']
  ctx.scene.session.infoEvent = ['dtstart','organizer','summary']
  /*
  isAuth(msg.chat.id)
  .then(auth => {
    ctx.scene.session.infoEvent[1] = auth;
    return ctx.wizard.next()
  })
  .catch(err => {
    ctx.reply("Debes de estar autenticado para realizar esta acción")
    return ctx.scene.leave()
  });*/
  //Estas tres lineas se borran cuando funcione lo de arriba
  ctx.reply("Todo Correcto. Indica el Título del Evento")
  ctx.scene.session.infoEvent[1] = 'john@d.oe'
  return ctx.wizard.next();
},
stepTituloAddEventHandler,
(ctx) => {
  
  const calendar = new Calendar(bot, {
    startWeekDay: 1,
    weekDayNames: ["L", "M", "X", "J", "V", "S", "D"],
    monthNames: [
      "Ene", "Feb", "Mar", "Abr", "May", "Jun",
      "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
    ]
  });
      const today = new Date();
      const minDate = new Date();
      const maxDate = new Date();
      maxDate.setMonth(today.getMonth() + 1);
      maxDate.setDate(today.getDate());
      calendar.setMaxDate(maxDate);
      calendar.setMinDate(minDate);
      calendar.setDateListener((context, date) => context.reply(date));
      ctx.reply("Elige un día para el nuevo evento", calendar.getCalendar())
      return ctx.wizard.next()
    },
    calendarHandler
    ,
    (ctx) => {
      ctx.scene.session.hour = "08"
      ctx.scene.session.min = "00"
      ctx.scene.session.mode = "AM"
      ctx.reply('Elige la hora del Evento')
      ctx.reply(`Tiempo: <b>${ctx.scene.session.hour}</b>:<b>${ctx.scene.session.min}</b> <b>${ctx.scene.session.mode}</b>`, hourPickerUI)
    }
    ,
    (ctx) => {
      ctx.reply('Evento `' + ctx.scene.session.infoEvent[2] + '` creado el día `' + ctx.scene.session.infoEvent[0] + '`')
      //Llamo al método de Dani pasando como parámetro Titulo = summary = infoEvent[2], Fecha = dtsart = infoEvent[0], Email = organiser = infoEvent[1]
      methods.vEventPub(infoEvent[0], infoEvent[1], infoEvent[2])
      return ctx.scene.leave()
    }
) 

const addEventStage = new Stage([addEventWizard], { default: 'addevent-wizard' })
bot.use(session())
bot.startPolling()