const config = require("./config.json");
const token = config.BOT_TOKEN;
const mongoose = require("mongoose");
const Calendar = require("./calendarUI/calendarUI");
const methods = require("./methods.js");
const Telegraf = require("telegraf");
const Composer = require("telegraf/composer");
const session = require("telegraf/session");
const Stage = require("telegraf/stage");
const Markup = require("telegraf/markup");
const WizardScene = require("telegraf/scenes/wizard");
const Router = require("telegraf/router");
const Extra = require("telegraf/extra");
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

const bot = new Telegraf(token);

let email;
bot.command("register", ctx => {
  // TODO: Verify real email
  email = ctx.message.text.split(" ")[1];
  register(ctx.from.id, email)
    .then(res => {
      ctx.reply(res);
    })
    .catch(err => {
      ctx.reply(err);
    });
});

bot.command("changemail", ctx => {
  // TODO: Verify real email
  email = ctx.message.text.split(" ")[1];
  changeEmail(ctx.from.id, email)
    .then(res => {
      ctx.reply(res);
    })
    .catch(err => {
      ctx.reply(err);
    });
});

let confirmationToken;
bot.command("confirm", ctx => {
  confirmationToken = ctx.message.text.split(" ")[1];
  confirmUser(msg.from.id, confirmationToken)
    .then(res => {
      ctx.reply(res);
    })
    .catch(err => {
      ctx.reply(err);
    });
});

bot.command("prueba", ctx => {
  isAuth(ctx.chat.id)
    .then(auth => {
      return ctx.reply("Tu email es " + auth);
    })
    .catch(err => {
      return ctx.reply(err);
    });
});

bot.command("addevent", ctx => {
  ctx.reply(
    "Primero tenemos que comprobar que estas autenticado",
    Markup.inlineKeyboard([
      Markup.callbackButton("➡️ Autenticar", "auth")
    ]).extra()
  );
  bot.use(addEventStage.middleware());
});

const stepTituloAddEventHandler = new Composer();
stepTituloAddEventHandler.use(ctx => {
  ctx.scene.session.infoEvent[2] = ctx.message.text;
  ctx.replyWithMarkdown(
    "El Título es: `" + ctx.message.text + "`",
    Markup.inlineKeyboard([
      Markup.callbackButton("➡️ Correcto", "next"),
      Markup.callbackButton("✏️ Editar", "back"),
      Markup.callbackButton("❌ Cancelar", "cancel")
    ]).extra()
  );
  return ctx.wizard.next();
});

const calendarHandler = new Composer();
calendarHandler.action(/calendar-telegram-date-[\d-]+/g, ctx => {
  let date = ctx.match[0].replace("calendar-telegram-date-", "");
  ctx.scene.session.infoEvent[0] = date;
  return ctx.editMessageText(
    `Día para el nuevo evento: <b>${ctx.scene.session.infoEvent[0]}</b>`,
    ctx.scene.session.calendar.getCalendar()
  );
});
calendarHandler.action("ok", ctx => {
  ctx.replyWithMarkdown(
    "La Fecha es: `" + ctx.scene.session.infoEvent[0] + "`",
    Markup.inlineKeyboard([
      Markup.callbackButton("➡️ Correcto", "next"),
      Markup.callbackButton("✏️ Editar", "back"),
      Markup.callbackButton("❌ Cancelar", "cancel")
    ]).extra()
  );
  return ctx.wizard.next();
});

const hourPickerUI = Extra.HTML().markup(m =>
  m.inlineKeyboard(
    [
      m.callbackButton("1", "hour:01"),
      m.callbackButton("2", "hour:02"),
      m.callbackButton("3", "hour:03"),
      m.callbackButton("4", "hour:04"),
      m.callbackButton("5", "hour:05"),
      m.callbackButton("6", "hour:06"),
      m.callbackButton("7", "hour:07"),
      m.callbackButton("8", "hour:08"),
      m.callbackButton("9", "hour:09"),
      m.callbackButton("10", "hour:10"),
      m.callbackButton("11", "hour:11"),
      m.callbackButton("12", "hour:12"),
      m.callbackButton("AM", "mode:AM"),
      m.callbackButton("PM", "mode:PM"),
      m.callbackButton("00", "min:00"),
      m.callbackButton("15", "min:15"),
      m.callbackButton("30", "min:30"),
      m.callbackButton("45", "min:45"),
      m.callbackButton("Clear", "clear"),
      m.callbackButton("Ok", "ok")
    ],
    { columns: 3 }
  )
);

const hourPicker = new Router(({ callbackQuery }) => {
  if (!callbackQuery || !callbackQuery.data) {
    return;
  }
  const parts = callbackQuery.data.split(":");
  return {
    route: parts[0],
    state: {
      value: parts[1]
    }
  };
});
hourPicker.on("hour", ctx => {
  ctx.scene.session.hour = ctx.state.value;
  return editTime(ctx);
});
hourPicker.on("min", ctx => {
  ctx.scene.session.min = ctx.state.value;
  return editTime(ctx);
});
hourPicker.on("mode", ctx => {
  ctx.scene.session.mode = ctx.state.value;
  return editTime(ctx);
});
hourPicker.on("clear", ctx => {
  ctx.scene.session.hour = "08";
  ctx.scene.session.min = "00";
  ctx.scene.session.mode = "AM";
  return editTime(ctx);
});
hourPicker.on("ok", ctx => {
  ctx.replyWithMarkdown(
    "La hora elegida es: `" +
      ctx.scene.session.hour +
      ":" +
      ctx.scene.session.min +
      " " +
      ctx.scene.session.mode +
      "`",
    Markup.inlineKeyboard([
      Markup.callbackButton("➡️ Correcto", "next"),
      Markup.callbackButton("✏️ Editar", "back"),
      Markup.callbackButton("❌ Cancelar", "cancel")
    ]).extra()
  );
  return ctx.wizard.next();
});

function editTime(ctx) {
  return ctx
    .editMessageText(
      `Hora del evento: <b>${ctx.scene.session.hour}</b>:<b>${
        ctx.scene.session.min
      }</b> <b>${ctx.scene.session.mode}</b>`,
      hourPickerUI
    )
    .catch(() => undefined);
}

function iCalendarDateTimeFormat(date, hour, min, mode) {
  if (mode.match("PM")) {
    let hour2 = parseInt(hour, 10) || 0;
    hour2 += 12;
    hour = hour2;
  }
  return date.replace("-", "") + "T" + hour + min + "00" + "Z";
}

const timeHandler = new Composer();
timeHandler.on("callback_query", hourPicker);

const addEventWizard = new WizardScene(
  "addevent-wizard",
  ctx => {
    if (ctx.callbackQuery && ctx.callbackQuery.data) {
      if (ctx.callbackQuery.message)
        ctx.deleteMessage(ctx.callbackQuery.message.message_id);
    }
    //Estructura de Event  ['dtstamp','dtstart','organizer','summary','uid']
    ctx.scene.session.infoEvent = ["dtstart", "organizer", "summary"];

    isAuth(ctx.from.id)
      .then(auth => {
        ctx.reply("Todo Correcto ✅. Indica el Título del Evento");
        ctx.scene.session.infoEvent[1] = auth;
        return ctx.wizard.next();
      })
      .catch(err => {
        ctx.reply("Debes de estar autenticado para realizar esta acción");
        return ctx.scene.leave();
      });
    //Estas tres lineas se borran cuando funcione lo de arriba
    // ctx.reply("Todo Correcto ✅. Indica el Título del Evento");
    // ctx.scene.session.infoEvent[1] = "john@d.oe";
    // return ctx.wizard.next();
  },
  stepTituloAddEventHandler,
  ctx => {
    if (ctx.callbackQuery && ctx.callbackQuery.data) {
      if (ctx.callbackQuery.data.match("cancel")) return ctx.scene.leave();
      else if (ctx.callbackQuery.data.match("back")) {
        try {
          console.log(ctx);
          ctx.deleteMessage(ctx.callbackQuery.message.message_id);
          console.log(ctx);
        } catch (error) {
          console.log(error);
        }

        ctx.reply("Indica el Título del Evento");
        return ctx.wizard.back();
      }
    }
    ctx.scene.session.calendar = new Calendar(bot, {
      startWeekDay: 1,
      weekDayNames: ["L", "M", "X", "J", "V", "S", "D"],
      monthNames: [
        "Ene",
        "Feb",
        "Mar",
        "Abr",
        "May",
        "Jun",
        "Jul",
        "Ago",
        "Sep",
        "Oct",
        "Nov",
        "Dic"
      ]
    });
    const today = new Date();
    const minDate = new Date();
    const maxDate = new Date();
    maxDate.setMonth(today.getMonth() + 1);
    maxDate.setDate(today.getDate());
    ctx.scene.session.calendar.setMaxDate(maxDate);
    ctx.scene.session.calendar.setMinDate(minDate);
    ctx.scene.session.infoEvent[0] = today.toISOString().split("T")[0];
    ctx.reply(
      `Día para el nuevo evento: <b>${ctx.scene.session.infoEvent[0]}</b>`,
      ctx.scene.session.calendar.getCalendar()
    );
    return ctx.wizard.next();
  },
  calendarHandler,
  ctx => {
    if (ctx.callbackQuery && ctx.callbackQuery.data) {
      if (ctx.callbackQuery.data.match("cancel")) return ctx.scene.leave();
      else if (ctx.callbackQuery.data.match("back")) {
        try {
          ctx.deleteMessage(ctx.callbackQuery.message.message_id);
        } catch (error) {
          console.log(error);
        }
        return ctx.wizard.back();
      }
    }
    ctx.scene.session.hour = "08";
    ctx.scene.session.min = "00";
    ctx.scene.session.mode = "AM";
    ctx.reply(
      `Hora del evento: <b>${ctx.scene.session.hour}</b>:<b>${
        ctx.scene.session.min
      }</b> <b>${ctx.scene.session.mode}</b>`,
      hourPickerUI
    );
    return ctx.wizard.next();
  },
  hourPicker,
  ctx => {
    if (ctx.callbackQuery && ctx.callbackQuery.data) {
      if (ctx.callbackQuery.data.match("cancel")) return ctx.scene.leave();
      else if (ctx.callbackQuery.data.match("back")) {
        try {
          ctx.deleteMessage(ctx.callbackQuery.message.message_id);
        } catch (error) {
          console.log(error);
        }
        return ctx.wizard.back();
      }
    }
    ctx.replyWithMarkdown(
      "Evento `" +
        ctx.scene.session.infoEvent[2] +
        "` creado el día `" +
        ctx.scene.session.infoEvent[0] +
        " " +
        ctx.scene.session.hour +
        ":" +
        ctx.scene.session.min +
        " " +
        ctx.scene.session.mode +
        "`"
    );
    //Guardamos la fecha en el formato de iCalendar
    ctx.scene.session.infoEvent[0] = iCalendarDateTimeFormat(
      ctx.scene.session.infoEvent[0],
      ctx.scene.session.hour,
      ctx.scene.session.min,
      ctx.scene.session.mode
    );
    //Llamo al método de Dani pasando como parámetro Titulo = summary = infoEvent[2], Fecha = dtsart = infoEvent[0], Email = organiser = infoEvent[1]
    methods
      .vEventPub(
        ctx.scene.session.infoEvent[0],
        ctx.scene.session.infoEvent[1],
        ctx.scene.session.infoEvent[2]
      )
      .then(res => {
        ctx.replyWithMarkdown("La id del evento creado es `" + res + "`");
        return ctx.scene.leave();
      })
      .catch(err => {
        ctx.reply("Ha ocurrido un error, vuelve a intentarlo");
        return ctx.scene.leave();
      });
  }
);
addEventWizard.command("cancel", ctx => ctx.scene.leave());
addEventWizard.command("back", ctx => ctx.wizard.back());
const addEventStage = new Stage([addEventWizard], {
  default: "addevent-wizard"
});
bot.use(session());
bot.startPolling();
