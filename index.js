const line = require('@line/bot-sdk');
const express = require('express');
const axios = require('axios').default;
const dotenv = require('dotenv');
const admin = require('firebase-admin');
const fs = require('fs');
const { Storage } = require('@google-cloud/storage');
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

admin.initializeApp({
  credential: admin.credential.cert(firebaseConfig),
  databaseURL: env.Realtime_Database_firebase,
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
const userGreetingsRef = db.ref('Data');

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

async function Webview(userId, monthsAgo, page = 1, pageSize = 20) {
  try {
    const regexPattern = /^\d{2}-\d{4}$/;
    const number = /^\d{1,2}$/;

    let startDate;

    if (regexPattern.test(monthsAgo)) {
      startDate = moment(monthsAgo, 'MM-YYYY').startOf('month').format('YYYY-MM-DD');
    } else if (number.test(monthsAgo)) {
      startDate = monthsAgo === '1'
        ? moment().startOf('month').format('YYYY-MM-DD')
        : moment().subtract(monthsAgo - 1, 'months').startOf('month').format('YYYY-MM-DD');
    } else if (monthsAgo === 'ทั้งหมด' || monthsAgo === 'all') {
      var All = monthsAgo;
      console.error(All);
    } else {
      console.error('Invalid monthsAgo format');
      return null;
    }

    console.log(startDate);

    const userGreetingsRef = await admin.firestore().collection(userId).get();

    const data = [];

    userGreetingsRef.forEach((doc) => {
      const transactionData = doc.data();
      const transactionDate = moment(transactionData.date).format('YYYY-MM-DD');

      if (
        transactionData.userid === userId &&
        (
          (number.test(monthsAgo) && moment(transactionData.date).isAfter(startDate)) ||
          (regexPattern.test(monthsAgo) && moment(transactionDate).isSame(startDate, 'month')) ||
          (monthsAgo === 'ทั้งหมด' || monthsAgo === 'all')
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

    return { data: paginatedData, hasMore, totalPages, currentPage: page, hasPreviousPage, hasNextPage };
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

    const { data, hasMore, totalPages, currentPage, hasPreviousPage, hasNextPage } = await Webview(webuserId, webmonthsAgo, page);

    // Create an array of page numbers for rendering
    const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

    res.render('index', { data, webuserId, webmonthsAgo, page: currentPage, hasMore, totalPages, pages, hasPreviousPage, hasNextPage });
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
          'x-authorization': 'SLIPOKSQQA6OA',
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
  const extract = 'Extracted';

  try {
    const existingDataSnapshot = await userGreetingsRef.child(extract).once('value');
    const existingUserData = existingDataSnapshot.val();

    //console.log('Response from Firebase:', existingUserData);
    //console.log('Type of existingUserData:', typeof existingUserData);
    //console.log('Name:', displayData.senderDisplayName.replace(/ำ/g, 'ํา'));

    const response = existingUserData;

    // Search for the specific texts
    const searchResults = [];
    const score = [];
    const searchTerms = [
      displayData.senderDisplayName.replace(/ำ/g, 'ํา'),
      displayData.receiverDisplayName,
      displayData.transactionAmount.toString(),
      displayData.transferRef
    ];
    const nomatch = [
      "ชื่อผู้ส่งไม่ตรง",
      "ชื่อผู้รับไม่ตรง",
      "ราคาไม่ตรง",
      "หมายเลขอ้างอิงไม่ตรง",
    ];

    for (let i = 0; i < searchTerms.length; i++) {
      const searchText = searchTerms[i];
      const notmatchtext = nomatch[i];
      let result = searchInResponse(response, searchText, notmatchtext);
      score.push(result.score);

      if ((i === 0 || i === 1) && result.score === 0 && /^[a-zA-Z\s]+$/.test((i === 0 ? displayData.senderDisplayName : displayData.receiverDisplayName))) {
        nomatch[i] = (i === 0 ? "ชื่อผู้ส่งที่ได้รับเป็นภาษาอังกฤษจึงไม่ตรงกับสลิป" : "ชื่อผู้รับที่ได้รับเป็นภาษาอังกฤษจึงไม่ตรงกับสลิป");
        result = searchInResponse(response, searchText, nomatch[i]);
      }

      if (i === 3 && result.score === 0) {
        const modifiedTransferRef = displayData.transferRef.replace(new RegExp(displayData.transactionDate, 'g'), '');
        const uniqueResults = new Set();

        if (response.includes(modifiedTransferRef)) {
          const searchResult = searchInResponse(response, modifiedTransferRef, notmatchtext);
          uniqueResults.add(searchResult.textResult);
          score.push(searchResult.score);
        } else {
          const refSearchTerms = [displayData.ref1, displayData.ref2];
          for (let j = 0; j < refSearchTerms.length; j++) {
            const result = searchInResponse(response, refSearchTerms[j], notmatchtext);
            uniqueResults.add(result.textResult);
            score.push(result.score === 0 ? 0 : 12.5);
          }
        }

        const uniqueResultsArray = Array.from(uniqueResults);
        searchResults.push(...uniqueResultsArray);
      }
      searchResults.push(result.textResult);
    }

    return {
      score: score,
      textResult: searchResults
    };
  } catch (error) {
    console.error(error);
    return null;
  }
}

function searchInResponse(response, searchText, notmatchtext) {
  let score = response.includes(searchText) ? 25 : 0;
  var textResult = "ถูกต้อง";

  if (score === 0 || (Array.isArray(score) && score[2] === 0)) {
    searchText = searchText + ".00";
    score = response.includes(searchText) ? 25 : 0;
  }

  if (score === 0) {
    textResult = "\n" + notmatchtext;
  }

  //console.log('Score:', score);
  //console.log('Text Result:', textResult);

  return {
    score: score,
    textResult: textResult
  };
}

function isEnglishText(text) {
  return /^[a-zA-Z]+$/.test(text);
}

async function deletereal_db() {
  const extractedRef = userGreetingsRef.child("Extracted");
  const existingSnapshot = await extractedRef.once('value');

  if (existingSnapshot.exists()) {
    console.warn('Data already exists. Deleting existing data...');
    await extractedRef.remove();
    console.log('Existing data deleted successfully.');
  }
}

const handleEvent = async (event) => {
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
      userId= event.source.userId;
      console.log(`เป็นเหตุการณ์รายบุคคล ${userId}`);
    }

    const Datauser = firestore.collection(userId);
    var imageIds = Array.isArray(event.message.id) ? event.message.id : [event.message.id];

    for (const imageId of imageIds) {
      var img = await module1.getImage(imageId);
      const verifyslipResult = await verifyslip(img.qrCodeData);
      var extractedText = await module1.extractTextFromImage(img.imgBase64);
      var displayData = await module1.extractDetails(verifyslipResult);
    }
    
    const flieimg = await createimg(img.imgBuffer, imageIds);
    const imgUri = await module1.generateDownloadUrl(flieimg);
    let statussave = "ถูกบันทึกเรียบร้อย";

    if (displayData.isSuccess != true) {
      const replyMessage = {
        type: 'text',
        text: 'QR Code หมดอายุ หรือ ไม่มีรายการอยู่จริง โปรดอัปโหลดสลิปอื่น',
      };
      await client.replyMessage(event.replyToken, replyMessage);
    } else {
      await userGreetingsRef.child("Extracted").set(extractedText.convertedArray);
      //console.log('Data saved successfully.');
      var transData = { "transDate": displayData.transactionDate, "transTime": displayData.transactionTime };
      var dateTime = module1.convertToDateTime(transData);

      var found = await searchTextInFirebase(displayData);

      var persent = Flex.calculateTotalScore(found);
      var uniqueFound = module1.removeOneDuplicate(found.textResult);
      const uniqueFoundWithoutNewline = uniqueFound.map(function (item) {
        return item.replace(/\n/g, '');
      });
      //console.log(found.score);
      //console.log(uniqueFoundWithoutNewline);

      let senderDisplayNameEN = displayData.senderDisplayName.replace(/[^a-zA-Z]+/g, '');
      let senderReceiverEN = displayData.receiverDisplayName.replace(/[^a-zA-Z]+/g, '');

      let senandrecei = isEnglishText(senderDisplayNameEN) && isEnglishText(senderReceiverEN);

      if (persent === 75 && (found.textResult[0].toString() === "\nชื่อผู้ส่งที่ได้รับเป็นภาษาอังกฤษจึงไม่ตรงกับสลิป" || found.textResult[1].toString() === "\nชื่อผู้ส่งที่ได้รับเป็นภาษาอังกฤษจึงไม่ตรงกับสลิป") && (!uniqueFoundWithoutNewline.includes("หมายเลขอ้างอิงไม่ตรง") && !uniqueFoundWithoutNewline.includes("ราคาไม่ตรง"))) {
        console.log("ตัวเลือกที่1");
        var displayIsDuplicate = await module1.saveUserData(userId, displayData, uniqueFoundWithoutNewline, dateTime, Datauser, imgUri);
        await Flex.sendFlexMessage(client, event, displayIsDuplicate, found, displayData, uniqueFoundWithoutNewline, senandrecei, statussave, dateTime, imgUri);
        deletereal_db();
      } else if (persent <= 50 && found.score[0] === 0 && found.score[1] === 0 && senandrecei === true && (!uniqueFoundWithoutNewline.includes("หมายเลขอ้างอิงไม่ตรง") && !uniqueFoundWithoutNewline.includes("ราคาไม่ตรง"))) {
        console.log("ตัวเลือกที่2");
        console.log(senandrecei);
        var displayIsDuplicate = await module1.saveUserData(userId, displayData, uniqueFoundWithoutNewline, dateTime, Datauser, imgUri);
        await Flex.sendFlexMessage(client, event, displayIsDuplicate, found, displayData, uniqueFoundWithoutNewline, senandrecei, statussave, dateTime, imgUri);
        deletereal_db();
      } else if ((!uniqueFoundWithoutNewline.includes("หมายเลขอ้างอิงไม่ตรง") && !uniqueFoundWithoutNewline.includes("ราคาไม่ตรง"))) {
        console.log("ตัวเลือกที่3");
        var displayIsDuplicate = await module1.saveUserData(userId, displayData, uniqueFoundWithoutNewline, dateTime, Datauser, imgUri);
        await Flex.sendFlexMessage(client, event, displayIsDuplicate, found, displayData, uniqueFoundWithoutNewline, senandrecei, statussave, dateTime, imgUri);
        deletereal_db();
      } else if (persent < 100 && found.score[4] == 12.5 && found.score[5] == 12.5 && found.score[3] == 0) {
        console.log("ตัวเลือกที่4");
        var newFoundWithoutNewline = uniqueFoundWithoutNewline.filter(item => item !== 'หมายเลขอ้างอิงไม่ตรง');
        var displayIsDuplicate = await module1.saveUserData(userId, displayData, newFoundWithoutNewline, dateTime, Datauser, imgUri);
        await Flex.sendFlexMessage(client, event, displayIsDuplicate, found, displayData, newFoundWithoutNewline, senandrecei, statussave, dateTime, imgUri);
        deletereal_db();
      } else if (persent < 100 && found.score[3] == 0) {
        console.log("ตัวเลือกที่5");
        displayIsDuplicate = "ข้อมูลไม่ตรง"
        statussave = "ไม่ได้ถูกบันทึก";
        await Flex.sendFlexMessage(client, event, displayIsDuplicate, found, displayData, uniqueFoundWithoutNewline, senandrecei, statussave, dateTime, imgUri);
        deletereal_db();
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

  if (event.type === 'message' && event.message.text === 'excel') {
    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: 'กรุณากรอกจำนวนเดือนที่ต้องการ เช่น \n1 คือข้อมูลในเดื่อนนี้\n2 คือข้อมูลในเดื่อนนี้และเดื่อนก่อน\n3 คือคือข้อมูลในเดื่อนนี้และ 2 เดือนก่อน เป็นต้น\nถ้าต้องการระบุเฉพาะเดือนที่ต้องการให้ระบุเป็น เดือน-ปี เช่น 02-2023, 03-2023, 01-2024 เป็นตัน',
    });

  } else if (event.type === 'message' && number.test(event.message.text) || regexPattern.test(event.message.text) || event.message.text == "all" || event.message.text == "ทั้งหมด") {
    
    if (event.source.type === 'group') {
      userId = event.source.groupId;
      console.log(`เป็นเหตุการณ์ในกลุ่ม ${userId}`);
    } else if (event.source.type === 'user') {
      userId= event.source.userId;
      console.log(`เป็นเหตุการณ์รายบุคคล ${userId}`);
    }
    
    monthsAgo = event.message.text;
    const excelFilePath = await module1.generateExcelForUser(userId, monthsAgo, firestore);

    if (excelFilePath) {
      const fileName = `Excel/${Date.now()}_output.xlsx`;
      const signedUrl = await module1.uploadFileToStorage(excelFilePath, fileName);

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
                text: number.test(event.message.text) ? 'ข้อมูลสลิปภายใน ' + monthsAgo + " เดือนที่ผ่านมา" : 'ข้อมูลสลิปภายในเดือน ' + (monthsAgo == "all" ? 'ทั้งหมด' : monthsAgo),
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
                      uri: 'https://linechatbot-rs7i.onrender.com/search/' + monthsAgo + "/" + userId
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
                    margin : 'md',
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
};

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('listening on 3000');
});
