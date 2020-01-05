var express = require("express");
var low = require("lowdb");
var FileSync = require("lowdb/adapters/FileSync");
var adapter = new FileSync(".data/db.json");
var db = low(adapter);
var app = express();
const axios = require("axios");
const cheerio = require("cheerio");

const Telegraf = require("telegraf");

const bot = new Telegraf(process.env.BOT_TOKEN);

var keepAlive = require("node-keepalive");
keepAlive({}, app);

let req_url =
  "https://web.spaggiari.eu/sdg/app/default/comunicati.php?sede_codice=VEIT0007";
let cssSelector =
  "#table-documenti > tbody > tr:nth-child(2) > td:nth-child(4) > div";
let rowSelector = "#table-documenti > tbody > tr:nth-child(2)";

// css selector of row
let titleSelector =
  "#table-documenti > tbody > tr:nth-child(2) > td:nth-child(2) > span:nth-child(1)";
let pubblicatoSelector =
  "#table-documenti > tbody > tr:nth-child(2) > td:nth-child(2) > span:nth-child(8)";
let categoriaSelector =
  "#table-documenti > tbody > tr:nth-child(2) > td:nth-child(2) > span:nth-child(6)";

app.use(express.static("public"));

db.defaults({ notices: [] }).write();

app.get("/notices", function(request, response) {
  var dbNotices = [];
  var notices = db.get("notices").value(); // Find all the notices
  notices.forEach(function(notice) {
    dbNotices.push(notice);
  });
  response.send(dbNotices);
});

app.post("/users", function(request, response) {
  db.get("users")
    .push({ firstName: request.query.fName, lastName: request.query.lName })
    .write();
  response.sendStatus(200);
});

app.get("/check", function(request, response) {
  axios.get(req_url).then(function(response) {
    console.log("Checking values...");
    let $ = cheerio.load(response.data);
    // select first item of the table
    let first_element = $(cssSelector);

    let id = first_element.attr("id_doc");

    let title = $(titleSelector).text();
    let pubblicato = $(pubblicatoSelector).text();
    let categoria = $(categoriaSelector).text();

    let viewDocumentUrl = `https://web.spaggiari.eu/sdg/app/default/view_documento.php?a=akVIEW_FROM_ID&id_documento=${id}&sede_codice=VEIT0007`;

    var notices = db.get("notices");

    var found = db
      .get("notices")
      .find({ id: id })
      .value();
    console.log(found);
    if (typeof found === "undefined") {
      console.log("should push!");
      notices
        .push({
          id: id,
          title: title,
          pubblicato: pubblicato,
          categoria: categoria,
          viewDocumentUrl: viewDocumentUrl
        })
        .write();
      var message = `📰 ${title}\n\n📅 ${pubblicato}\n\n👤 ${categoria}\n\n📎 <a href='${viewDocumentUrl}'>Visualizza allegato</a>`;

      bot.telegram.sendMessage("@newszuccantebeta", message, {
        parse_mode: "HTML"
      });
    }
  });

  response.send("Checked!");
});

// removes all entries from the collection
app.get("/clear", function(request, response) {
  // removes all entries from the collection
  db.get("notices")
    .remove()
    .write();
  //console.log("Database cleared");
  response.redirect("/");
});

// listen for requests :)
var listener = app.listen(process.env.PORT, function() {
  console.log("Your app is listening on port " + listener.address().port);
});
