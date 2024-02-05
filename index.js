const line = require('@line/bot-sdk');
const express = require('express');
const axios = require('axios').default;
const dotenv = require('dotenv');
const admin = require('firebase-admin');
const functions = require('firebase-functions');
const fs = require('fs');
const {Storage} = require('@google-cloud/storage');
const hbs = require('hbs');
const fetch = require('node-fetch');
const moment = require('moment');

const env = dotenv.config().parsed;
const app = express();

const sharp = require('sharp');

const firebaseConfigPath = 'firebase.json';
const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));

const module1 = require('./extractedtext');
const Flex = require('./Flex');

const regexPattern = /^\d{2}-\d{4}$/;
const number = /^\d{1,2}$/;
const datepattern = /^(0?[1-9]|1[0-2])\s*-\s*(20\d{2})\s*-\s*(0?[1-9]|1[0-2])\s*-\s*(20\d{2})$/;

admin.initializeApp({
  credential: admin.credential.cert(firebaseConfig),
  databaseURL: env.Realtime_Database_firebase,
});

exports.scheduledFunction = functions.pubsub.schedule('every 24 hours').timeZone('Asia/Bangkok').onRun((context) => {
  const db = admin.database();
  const rootRef = db.ref();
  return rootRef.remove()
    .then(() => {
      console.log('Data deleted successfully.');
      return null;
    })
    .catch((error) => {
      console.error('Error deleting data:', error);
    });
});

app.set('view engine', 'hbs');
hbs.registerPartials(__dirname + '/views/partials');
hbs.registerHelper('subtract', function (a, b) {
  return a - b;
});
hbs.registerHelper('add', function (a, b) {
  return a + b;
});

const lineConfig = {
  channelAccessToken: env.ACCESS_TOKEN,
  channelSecret: env.SECRET_TOKEN
};

const client = new line.Client(lineConfig);

let userId
const db = admin.database();
const firestore = admin.firestore();
const userGreetingsRef = db.ref(userId);

app.post('/webhook', line.middleware(lineConfig), async (req, res) => {
  try {
    const events = req.body.events;
    //console.log('events =>>>', events);

    for (const item of events) {
      await handleEvent(item);
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error(error);
    res.status(500).end();
  }
});

async function Webview(userId, monthsAgos, page = 1, pageSize = 20) {
  try {
    const regexPattern = /^\d{2}-\d{4}$/;
    const number = /^\d{1,2}$/;
    const datepattern = /^(0?[1-9]|1[0-2])\s*-\s*(20\d{2})\s*-\s*(0?[1-9]|1[0-2])\s*-\s*(20\d{2})$/;

    let startDate = 0;
    let endDate = 0;
    let newmoths = 0;
    
    const monthsAgo = monthsAgos.replace(/_-_/g, ' - ');

    if (regexPattern.test(monthsAgo)) {
      startDate = moment(monthsAgo, 'MM-YYYY').startOf('month').format('YYYY-MM-DD');
    } else if (number.test(monthsAgo)) {
      startDate = monthsAgo === '1'
        ? moment().startOf('month').format('YYYY-MM-DD')
        : moment().subtract(monthsAgo - 1, 'months').startOf('month').format('YYYY-MM-DD');
    } else if (datepattern.test(monthsAgo)) {
      console.log(monthsAgo);
      const [startDateString, endDateString] = monthsAgo.split(" - ");
      startDate = moment(startDateString, 'MM-YYYY').startOf('month').format('YYYY-MM-DD');
      endDate = moment(endDateString, 'MM-YYYY').endOf('month').format('YYYY-MM-DD');
    } else if (datepattern.test(monthsAgo) || datepattern.test(monthsAgo.replace(/​/g, ''))) {
      if (datepattern.test(monthsAgo)) {
        console.log("Matched!");
        newmoths = monthsAgo;
      } else {
        console.log("Not matched!");
        newmoths = monthsAgo.replace(/​/g, '');
      }

      const [startDateString, endDateString] = newmoths.split(" - ");
      startDate = moment(startDateString, 'MM-YYYY').startOf('month').format('YYYY-MM-DD');
      endDate = moment(endDateString, 'MM-YYYY').endOf('month').format('YYYY-MM-DD');
      
    }   else if (monthsAgo === 'ทั้งหมด' || monthsAgo === 'all') {
      var All = monthsAgo;
      console.error(All);
    } else {
      console.error('Invalid monthsAgo format');
      return null;
    }

    console.log(startDate);

    const userGreetingsRef = await admin.firestore().collection("Data").get();

    const data = [];

    userGreetingsRef.forEach((doc) => {
      const transactionData = doc.data();
      const transactionDate = moment(transactionData.date).format('YYYY-MM-DD');

      if (
        transactionData.userid === userId &&
        (
          (number.test(monthsAgo) && moment(transactionData.date).isAfter(startDate)) ||
          (regexPattern.test(monthsAgo) && moment(transactionDate).isSame(startDate, 'month')) ||
          (monthsAgo === 'ทั้งหมด' || monthsAgo === 'all') || (transactionData.userid === userId &&
            moment(transactionData.date).isBetween(startDate, endDate, null, '[]') &&
            datepattern.test(monthsAgo)) || (transactionData.userid === userId &&
              moment(transactionData.date).isBetween(startDate, endDate, null, '[]') &&
              datepattern.test(newmoths))
        )
      ) {
        data.push(transactionData);
      }
    });

    const totalDataCount = data.length;

    const totalPages = Math.ceil(totalDataCount / pageSize);

    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedData = data.slice(startIndex, endIndex);

    const hasMore = endIndex < totalDataCount;

    // Calculate hasPreviousPage and hasNextPage
    const hasPreviousPage = page > 1;
    const hasNextPage = endIndex < totalDataCount;

    return {data: paginatedData, hasMore, totalPages, currentPage: page, hasPreviousPage, hasNextPage};
  } catch (error) {
    console.error('Error fetching data from Firestore:', error);
    throw error;
  }
}

let monthsAgo;

app.get('/search/:monthsAgo/:userid', async (req, res) => {
  try {
    const webuserId = userId;
    const webmonthsAgo = req.params.monthsAgo;
    const page = parseInt(req.query.page) || 1;

    const {data, hasMore, totalPages, currentPage, hasPreviousPage, hasNextPage} = await Webview(webuserId, webmonthsAgo, page);

    // Create an array of page numbers for rendering
    const pages = Array.from({length: totalPages}, (_, i) => i + 1);

    res.render('index', {data, webuserId, webmonthsAgo, page: currentPage, hasMore, totalPages, pages, hasPreviousPage, hasNextPage});
  } catch (error) {
    console.error('Error calling Webview function:', error);
    res.status(500).send('Internal Server Error');
  }
});

async function createimg(img, id) {
  const pngBuffer = await sharp(img).toFormat('png').toBuffer();

  const fileName = `Images/image_${id}.png`;
  await module1.uploadImgToStorage(pngBuffer, fileName);

  return fileName;
}

async function verifyslip(text) {
  try {
    const qrString = text
    const res = await axios.post(
      'https://api.slipok.com/api/line/apikey/14226',
      {
        data: qrString,
      },
      {
        headers: {
          'x-authorization': 'SLIPOKABVDCRW',
          'Content-Type': 'application/json',
        },
      }
    )
    console.log(res.data)
    return res.data
  } catch (err) {
    console.log(err.response.data)
  }

}

async function searchTextInFirebase(displayData) {
  const extract1 = userId + 1;
  const extract2= userId + 2;

  try {
    const existingDataSnapshot1 = await userGreetingsRef.child(extract1).once('value');
    const existingUserData1 = existingDataSnapshot1.val();

    const existingDataSnapshot2 = await userGreetingsRef.child(extract2).once('value');
    const existingUserData2 = existingDataSnapshot2.val();

    //console.log('Response from Firebase:', existingUserData);
    //console.log('Type of existingUserData:', typeof existingUserData);
    //console.log('Name:', displayData.senderDisplayName.replace(/ำ/g, 'ํา'));

    const response1 = existingUserData1;
    const response2 = existingUserData2;

    // Search for the specific texts
    const searchResults = [];
    const score = [];
    const Name = [
      displayData.senderDisplayName.replace(/ำ/g, 'ํา'),
      displayData.receiverDisplayName,
    ];
    const searchTerms = [
      displayData.transactionAmount.toString(),
      displayData.transferRef
    ];
    const nomatchname = [
      "ชื่อผู้ส่งไม่ตรง",
      "ชื่อผู้รับไม่ตรง",
    ];
    const nomatch = [
      "ราคาไม่ตรง",
      "หมายเลขอ้างอิงไม่ตรง",
    ];

    for (let i = 0; i < Name.length; i++) {
      const searchText = Name[i];
      const notmatchtext = nomatchname[i];
      let result = searchInResponse(response2, searchText, notmatchtext);
      score.push(result.score);

      if ((i === 0 || i === 1) && result.score === 0 && /^[a-zA-Z\s]+$/.test((i === 0 ? displayData.senderDisplayName : displayData.receiverDisplayName))) {
        nomatch[i] = (i === 0 ? "ชื่อผู้ส่งที่ได้รับเป็นภาษาอังกฤษจึงไม่ตรงกับสลิป" : "ชื่อผู้รับที่ได้รับเป็นภาษาอังกฤษจึงไม่ตรงกับสลิป");
        result = searchInResponse(response2, searchText, nomatch[i]);
      }
      searchResults.push(result.textResult);
    }

    for (let i = 0; i < searchTerms.length; i++) {
      const searchText = searchTerms[i];
      const notmatchtext = nomatch[i];
      let result = searchInResponse(response1, searchText, notmatchtext);
      score.push(result.score);

      if (i === 1 && result.score === 0) {
        const modifiedTransferRef = displayData.transferRef.replace(new RegExp(displayData.transactionDate, 'g'), '');
        const uniqueResults = new Set();

        if (response1.includes(modifiedTransferRef)) {
          const searchResult = searchInResponse(response1, modifiedTransferRef, notmatchtext);
          uniqueResults.add(searchResult.textResult);
          score.push(searchResult.score);
        } else {
          const refSearchTerms = [displayData.ref1, displayData.ref2];
          for (let j = 0; j < refSearchTerms.length; j++) {
            const result = searchInResponse(response1, refSearchTerms[j], notmatchtext);
            uniqueResults.add(result.textResult);
            score.push(result.score === 0 ? 0 : 12.5);
          }
        }

        const uniqueResultsArray = Array.from(uniqueResults);
        searchResults.push(...uniqueResultsArray);
      }
      searchResults.push(result.textResult);
    }

    console.log(searchResults);
    return {
      score: score,
      textResult: searchResults
    };
  } catch (error) {
    console.error(error);
    return null;
  }
}

function searchInResponse(response1, searchText, notmatchtext) {
  let score = response1.includes(searchText) ? 25 : 0;
  var textResult = "ถูกต้อง";

  if (score === 0 || (Array.isArray(score) && score[0] === 0)) {
    searchText = searchText + ".00";
    score = response1.includes(searchText) ? 25 : 0;
  }

  if (score === 0) {
    textResult = "\n" + notmatchtext;
  }

  console.log('Score:', score);
  console.log('Text Result:', textResult);

  return {
    score: score,
    textResult: textResult
  };
}

function isEnglishText(text) {
  return /^[a-zA-Z]+$/.test(text);
}

async function deletereal_db() {
  const extractedRef1 = userGreetingsRef.child(userId +1);
  const existingSnapshot1 = await extractedRef1.once('value');
  if (existingSnapshot1.exists()) {
    console.warn('Data already exists. Deleting existing data...');
    await extractedRef1.remove();
    console.log('Existing data deleted successfully.');
  }

  const extractedRef2 = userGreetingsRef.child(userId +2);
  const existingSnapshot2 = await extractedRef2.once('value');
  if (existingSnapshot2.exists()) {
    console.warn('Data already exists. Deleting existing data...');
    await extractedRef.remove();
    console.log('Existing data deleted successfully.');
  }
}

let displayIsDuplicate = "ถูกต้อง";
let imagenumber = 0;
let persent = 0;

numberevent = 0;

const handleEvent = async (event) => {
  numberevent++;
  console.log("numberevent " + numberevent);
  if (numberevent > 1) {
    imagenumber = 0;
    console.log("imagenumber " + imagenumber);
  }

  //console.log('event');
  /*
  if (event.type === 'follow') {
    const userId = event.source.userId;
    const snapshot = await userGreetingsRef.child(userId).once('value');
    const userGreeted = snapshot.val();

    if (!userGreeted) {
        userGreetingsRef = db.ref(userId);
        await saveUserData(userId);
    }
  }
  */
  if (event.type === 'message' && event.message.type === 'image') {

    if (event.source.type === 'group') {
      userId = event.source.groupId;
      console.log(`เป็นเหตุการณ์ในกลุ่ม ${userId}`);
    } else if (event.source.type === 'user') {
      userId = event.source.userId;
      console.log(`เป็นเหตุการณ์รายบุคคล ${userId}`);
    }

    const Datauser = firestore.collection("Data");
    var imageIds = Array.isArray(event.message.id) ? event.message.id : [event.message.id];
    console.log("imageid: " + imageIds);
    for (const imageId of imageIds) {
      var img = await module1.getImage(imageId);
      const verifyslipResult = await verifyslip(img.qrCodeData);
      var extractedText = await module1.extractTextFromImage(img.imgBase64);
      var displayData = await module1.extractDetails(verifyslipResult);
    }

    const flieimg = await createimg(img.imgBuffer, imageIds);
    const imgUri = await module1.generateDownloadUrl(flieimg);
    let statussave = "ไม่ได้ถูกบันทึก";

    if (displayData.isSuccess != true) {
      const replyMessage = {
        type: 'text',
        text: 'QR Code หมดอายุ หรือ ไม่มีรายการอยู่จริง โปรดอัปโหลดสลิปอื่น',
      };
      await client.replyMessage(event.replyToken, replyMessage);
    } else {
      await userGreetingsRef.child(userId + 1).set(extractedText.convertedArray);
      await userGreetingsRef.child(userId + 2).set(extractedText.extractedTextFix);
      //console.log('Data saved successfully.');
      var transData = {"transDate": displayData.transactionDate, "transTime": displayData.transactionTime};
      var dateTime = module1.convertToDateTime(transData);

      var found = await searchTextInFirebase(displayData);

      persent = Flex.calculateTotalScore(found);
      console.log("WWW : " + persent);

      var uniqueFound = module1.removeOneDuplicate(found.textResult);
      const uniqueFoundWithoutNewline = uniqueFound.map(function (item) {
        return item.replace(/\n/g, '');
      });
      console.log(found.score);
      console.log(uniqueFoundWithoutNewline);

      let senderDisplayNameEN = displayData.senderDisplayName.replace(/[^a-zA-Z]+/g, '');
      let senderReceiverEN = displayData.receiverDisplayName.replace(/[^a-zA-Z]+/g, '');

      let senandrecei = isEnglishText(senderDisplayNameEN) && isEnglishText(senderReceiverEN);

      let note = "";

      const documentRef = await Datauser.doc(displayData.transferRef);
      const existingDoc = await documentRef.get();

      if (existingDoc.exists) {
        console.warn("ข้อมูลของคุณมีอยู่แล้ว");
        displayIsDuplicate = "สลิปซ้ำ";
        await Flex.sendFlexMessage(client, event, userId, displayIsDuplicate, found, displayData, note, senandrecei, statussave, dateTime, imgUri);
        deletereal_db();
      } else {
        if (persent === 100) {
          console.log("ตัวเลือกที่1");
          statussave = "ถูกบันทึกเรียบร้อย";
          note = uniqueFoundWithoutNewline.filter(item => item !== 'หมายเลขอ้างอิงไม่ตรง');
          await Flex.sendFlexMessage(client, event, userId, displayIsDuplicate, found, displayData, note, senandrecei, statussave, dateTime, imgUri);
          await module1.saveUserData(userId, displayData, note, dateTime, Datauser, imgUri);
          deletereal_db();
        } else if (persent == 100 && found.score[4] == 12.5 && found.score[5] == 12.5 && found.score[3] == 0) {
          console.log("ตัวเลือกที่2");
          statussave = "ถูกบันทึกเรียบร้อย";
          note = uniqueFoundWithoutNewline.filter(item => item !== 'หมายเลขอ้างอิงไม่ตรง');
          await Flex.sendFlexMessage(client, event, userId, displayIsDuplicate, found, displayData, note, senandrecei, statussave, dateTime, imgUri);
          await module1.saveUserData(userId, displayData, note, dateTime, Datauser, imgUri);
          deletereal_db();
        }

        if ((persent < 100 && !uniqueFoundWithoutNewline.includes("หมายเลขอ้างอิงไม่ตรง") && !uniqueFoundWithoutNewline.includes("ราคาไม่ตรง"))) {
          console.log("ตัวเลือกที่3");
          console.log("WWW : ");
          imagenumber++;
          note = uniqueFoundWithoutNewline.filter(item => item !== 'หมายเลขอ้างอิงไม่ตรง');
          await module1.incorrectdata(client, event, userGreetingsRef, imageIds, imagenumber, userId, displayData, note, imgUri, Flex, displayIsDuplicate);
          deletereal_db();
        } else if (persent < 100 && found.score[4] == 12.5 && found.score[5] == 12.5 && found.score[3] == 0 && found.score[2] == 25) {
          console.log("ตัวเลือกที่4");
          imagenumber++;
          note = uniqueFoundWithoutNewline.filter(item => item !== 'หมายเลขอ้างอิงไม่ตรง');
          console.log(note);
          await module1.incorrectdata(client, event, userGreetingsRef, imageIds, imagenumber, userId, displayData, note, imgUri, Flex, displayIsDuplicate, found, senandrecei, statussave, dateTime);
          deletereal_db();
        } else if (persent < 100 && found.score[3] == 0 || found.score[2] == 0) {
          console.log("ตัวเลือกที่5");
          displayIsDuplicate = "ไม่ถูกต้อง";
          await Flex.sendFlexMessage(client, event, userId, displayIsDuplicate, found, displayData, uniqueFoundWithoutNewline, senandrecei, statussave, dateTime, imgUri);
          deletereal_db();
        }
      }
    }


    /*
    if (found.score[3] == 25 && found.score[2] == 25) {
      var displayIsDuplicate = await saveUserData(userId, extractedText, displayData);
      await Flex.sendFlexMessage(client, event, displayIsDuplicate, found, displayData);
    }else {
      var displayIsDuplicate = "ไม่ถูกต้อง";
      await Flex.sendFlexMessage(client, event, displayIsDuplicate, found, displayData);
    }
    */
  }
  /*
  if (event.type === 'message' && event.message.text === 'save') {
      const userId = event.source.userId;
      await saveUserData(userId);
  }
  */


  if (event.type === 'postback') {
    console.log("Event type is 'postback'");
    console.log("Original data:", event.postback.data);

    let parts = event.postback.data.split("บันทึก");
    let newData = parts[1];

    const searchTerm = "ไม่บันทึก";

    console.log("Modified data:", newData);

    if (event.postback.data.toLowerCase().includes(searchTerm.toLowerCase())) {
      let parts = event.postback.data.split("ไม่บันทึก");
      let newData = parts[1];
      console.log('Delete' + newData);
  
      const usernumber = userId + newData;
      console.log(usernumber);
      await module1.deletereal_db(newData, userGreetingsRef, userId);
      
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: 'ไม่บันทึกข้อมูล',
      });
    } else {
      console.log("Event type is 'postback'");
      console.log(newData);

      if (event.source.type === 'group') {
        userId = event.source.groupId;
        console.log(`เป็นเหตุการณ์ในกลุ่ม ${userId}`);
      } else if (event.source.type === 'user') {
        userId = event.source.userId;
        console.log(`เป็นเหตุการณ์รายบุคคล ${userId}`);
      }
      /*
      const splitText = event.message.text.split(' ');
      const numericValue = splitText[1];
      */

      const usernumber = userId + newData;
      console.log(usernumber);

      const Datauser = firestore.collection("Data");
      const databaseRef = db.ref(usernumber);

      databaseRef.once('value')
        .then(async (snapshot) => {
          const data = snapshot.val();
          console.log(data.amount);
          const displayData = {
            transactionDate: data.date,
            senderDisplayName: data.sender,
            receiverDisplayName: data.receiver,
            transactionAmount: data.amount,
            transferRef: data.transactionId,
          };

          console.log(displayData.transferRef);

          var transData = {"transDate": data.datetransfer, "transTime": data.timetransfer};
          const dateTime = module1.convertToDateTime(transData);

          await module1.saveUserData(data.userid, displayData, data.note, dateTime, Datauser, data.fileUrl);
          await module1.deletereal_db(newData, userGreetingsRef, userId);

          await client.replyMessage(event.replyToken, {
            type: 'text',
            text: 'ข้อมูลถูกบันทึกเรียบร้อย',
          });
        })
        .catch(async (error) => {
          console.error('Error fetching data:', error);
          await client.replyMessage(event.replyToken, {
            type: 'text',
            text: 'ไม่สามารถบันทึกข้อมูลได้เกิดข้อผิดพลาดในการบันทึกหรือข้อมูลนี้ถูกลบไปแล้ว',
          });
        });
    }

  }

  else if (event.type === 'message' && event.message.text === 'excel') {
    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: 'กรุณากรอกจำนวนเดือนที่ต้องการ เช่น \n1 คือข้อมูลในเดื่อนนี้\n2 คือข้อมูลในเดื่อนนี้และเดื่อนก่อน\n3 คือคือข้อมูลในเดื่อนนี้และ 2 เดือนก่อน เป็นต้น\nถ้าต้องการระบุเฉพาะเดือนที่ต้องการให้ระบุเป็น เดือน-ปี เช่น 02-2023, 03-2023, 01-2024 เป็นตัน',
    });

  } else if (event.type === 'message' && number.test(event.message.text) || regexPattern.test(event.message.text) || event.message.text == "all" || event.message.text == "ทั้งหมด" 
  || datepattern.test(event.message.text) || datepattern.test(event.message.text.replace(/​/g, ''))) {

    monthsAgo = event.message.text;    

    if (event.source.type === 'group') {
      userId = event.source.groupId;
      console.log(`เป็นเหตุการณ์ในกลุ่ม ${userId}`);
    } else if (event.source.type === 'user') {
      userId = event.source.userId;
      console.log(`เป็นเหตุการณ์รายบุคคล ${userId}`);
    }


    const excelFilePath = await module1.generateExcelForUser(userId, monthsAgo, firestore);

    if (excelFilePath) {
      const fileName = `Excel/${Date.now()}_output.xlsx`;
      const signedUrl = await module1.uploadFileToStorage(excelFilePath, fileName);
      console.log(monthsAgo);
      const modifiedString = monthsAgo.replace(/​/g, '').replace(/ - /g, '-');
      const link = monthsAgo.replace(/​/g, '').replace(/ - /g, '_-_');
      console.log(link);

      await client.replyMessage(event.replyToken, {
        type: 'flex',
        altText: 'สร้าง Excel',
        contents: {
          type: 'bubble',
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: number.test(event.message.text) ? 'ข้อมูลสลิปภายใน ' + modifiedString + " เดือนที่ผ่านมา" : 'ข้อมูลสลิปภายในเดือน ' + (modifiedString == "all" ? 'ทั้งหมด' : modifiedString),
                wrap: true,
                size: 'md',
                align: 'center'
              },
              {
                type: 'box',
                layout: 'vertical',
                margin: 'md',
                contents: [
                  {
                    type: 'button',
                    style: 'primary',
                    color: '#1DB446',
                    action: {
                      type: 'uri',
                      label: 'ดูข้อมูล',
                      uri: 'https://c16e-2405-9800-b640-6fe3-00-9.ngrok-free.app/search/' + link + "/" + userId
                    },
                    height: 'sm',
                  },
                  {
                    type: 'button',
                    style: 'primary',
                    color: '#1DB446',
                    action: {
                      type: 'uri',
                      label: 'ดาวน์โหลด',
                      uri: signedUrl[0]
                    },
                    height: 'sm',
                    margin: 'md',
                  }
                ]
              }
            ]
          }
        }
      });


    } else {
      // Handle error
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: 'ไม่สามารถสร้างไฟล์ Excel ได้',
      });
    }
  } else if (event.type === 'message' && !event.message.type === 'image') {
    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: 'ไม่มีฟังชั้นนี้โปรดส่งข้อมูลใหม่',
    });
  }

  /*const regex = /^บันทึกรูปที่ [1-9][0-9]?$|100$/;

  const regex = /^บันทึกรูปที่ [1-9][0-9]* บันทึกข้อความ \d+$/;  
  if (event.type === 'message' && regex.test(event.message.text)) {
      const matchResult = event.message.text.match(/บันทึกรูปที่ (\d+) บันทึกข้อความ (\d+)/);

    if (matchResult) {
      var numericValue = matchResult[1];
      var imageIds = matchResult[2];
    
      console.log("imagenumber:", imagenumber);
      console.log("imageIds:", imageIds);
    } else {
      console.log("No match found in the event message.");
    }
  }
  */
};

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('listening on 3000');
});
