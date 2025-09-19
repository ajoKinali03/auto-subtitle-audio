import * as fs from "fs";
import readline from "readline";
import {
  GoogleGenAI,
  createUserContent,
  createPartFromUri,
} from "@google/genai";
import 'dotenv/config';

const apiKey = process.env.GOOGLE_GENAI_API_KEY;


const ai = new GoogleGenAI({
  apiKey: apiKey,
});

function startLoading(text = "Processing") {
  const spinner = ["|", "/", "-", "\\"];
  let i = 0;
  return setInterval(() => {
    process.stdout.write(`\r${text}... ${spinner[i++]}`);
    i %= spinner.length;
  }, 100);
}

// Fungsi untuk input interaktif
function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim());
    })
  );
}
// stop loading
function stopLoading(intervalId) {
  clearInterval(intervalId);
  process.stdout.write("\r\x1b[K"); // clear line
}

// Fungsi untuk meminta file audio sampai valid
async function getAudioFile() {
  while (true) {
    const filePath = await askQuestion(
      "Masukkan path file audio (misal: ./my-audio.wav): "
    );
    if (fs.existsSync(filePath)) {
      return filePath;
    } else {
      console.log("❌ File tidak ditemukan. Silakan coba lagi.");
    }
  }
}

// Fungsi untuk meminta lokasi file output
async function getOutputFile() {
  const filePath = await askQuestion(
    "Masukkan path output SRT (misal: ./subtitle.srt): "
  );
  return filePath || "./subtitle.srt"; // default
}

// Fungsi bantu konversi waktu ke format SRT
function convertToSRTTime(timeStr) {
  let [min, secMs] = timeStr.split(":");
  let [sec, ms] = secMs.split(".");
  ms = ms || "0";
  while (ms.length < 3) ms += "0";
  const hours = "00";
  const minutes = min.padStart(2, "0");
  const seconds = sec.padStart(2, "0");
  return `${hours}:${minutes}:${seconds},${ms}`;
}

async function main() {
  try {
    // Input file audio dari terminal
    const audioPath = await getAudioFile();

    // Input lokasi file output
    const outputPath = await getOutputFile();

    let loader = startLoading();


    // Upload audio ke AI
    const myfile = await ai.files.upload({
      file: audioPath,
      config: { mimeType: "audio/wav" },
    });

    // Generate transcription / word-timing
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: createUserContent([
        createPartFromUri(myfile.uri, myfile.mimeType),
        'buat objek of array seperti ini berdasarkan audio tersebut{word: word, timeStart: time, timeEnd: time} untuk key word berisi value kata yang di ucapkan, key timeStart berisi value waktu awal kata itu diucapkan, dan key timeEnd berisi waktu akhir kata itu diucapkan serta jadikan setiap key dan value jadikan string. selalu konsisten untuk format objek nya seperti objek ini { "word": "text", "timeStart": "0:00.000", "timeEnd": "0:00.000"}',
      ]),
    });

    stopLoading(loader);

    // Simpan hasil raw ke file sementara
    fs.writeFileSync("data.txt", response.text, "utf8");

    // Baca dan bersihkan data
    let data = fs.readFileSync("data.txt", "utf8");
    data = data.replaceAll("`", "").replace("json", "");
    const dt = JSON.parse(data);

    // Buat konten SRT
    let srtContent = "";
    dt.forEach((w, i) => {
      const index = i + 1;
      const start = convertToSRTTime(w.timeStart);
      const end = convertToSRTTime(w.timeEnd);
      srtContent += `${index}\n${start} --> ${end}\n${w.word}\n\n`;
    });

    // Simpan ke file output
    fs.writeFileSync(outputPath, srtContent, "utf8");
    console.log(`✅ Subtitle berhasil dibuat: ${outputPath}`);
  } catch (err) {
    console.error("❌ Terjadi error:", err);
  }
}

await main();

// import * as fs from "fs";
// import {
//   GoogleGenAI,
//   createUserContent,
//   createPartFromUri,
// } from "@google/genai";

// const ai = new GoogleGenAI({
//   apiKey: "AIzaSyCyyu_yPAsos_HJLjvb94psHBlJAa3VDj0",
// });

// async function main() {
//   const myfile = await ai.files.upload({
//     file: "./my-audio.wav",
//     config: { mimeType: "audio/wav" },
//   });

//   const response = await ai.models.generateContent({
//     model: "gemini-2.5-flash",
//     contents: createUserContent([
//       createPartFromUri(myfile.uri, myfile.mimeType),
//       'buat objek of array seperti ini berdasarkan audio tersebut{word: word, timeStart: time, timeEnd: time} untuk key word berisi value kata yang di ucapkan, key timeStart berisi value waktu awal kata itu diucapkan, dan key timeEnd berisi waktu akhir kata itu diucapkan serta jadikan setiap key dan value jadikan string. selalu konsisten untuk format objek nya seperti objek ini { "word": "text", "timeStart": "0:00.000", "timeEnd": "0:00.000"}',
//     ]),
//   });

//   let wordTimeData = response.text;
//   fs.writeFileSync("data.txt", wordTimeData, (err) => {
//     if (err) {
//       console.error("Error creating file:", err);
//     } else {
//       console.log('File "myFile.txt" created successfully!');
//     }
//   });

//   try {
//     const data = fs.readFileSync("./data.txt", "utf8");
//     // console.log('File content:', data);
//     let dt = data.replaceAll("`", "").replace("json", "");
//     dt = JSON.parse(dt);

//     // Contoh array input

//     // Fungsi bantu konversi waktu ke format SRT
//     function convertToSRTTime(timeStr) {
//       // timeStr contoh: '0:47.5' atau '0:47.55' atau '0:47.355'
//       let [min, secMs] = timeStr.split(":");
//       let [sec, ms] = secMs.split(".");
//       ms = ms || "0";

//       // Tambahkan nol di akhir supaya milidetik selalu 3 digit
//       while (ms.length < 3) ms += "0";

//       // Format SRT: HH:MM:SS,mmm
//       const hours = "00";
//       const minutes = min.padStart(2, "0");
//       const seconds = sec.padStart(2, "0");
//       return `${hours}:${minutes}:${seconds},${ms}`;
//     }

//     // Buat konten SRT
//     let srtContent = "";
//     dt.forEach((w, i) => {
//       const index = i + 1;
//       const start = convertToSRTTime(w.timeStart);
//       const end = convertToSRTTime(w.timeEnd);
//       const text = w.word;

//       srtContent += `${index}\n${start} --> ${end}\n${text}\n\n`;
//     });

//     // Simpan ke file .srt
//     fs.writeFileSync("subtitle.srt", srtContent, "utf8");
//     console.log("✅ Subtitle berhasil dibuat: output.srt");

//     // console.log('File content:', JSON.parse(dt));
//   } catch (err) {
//     console.error("Error reading file:", err);
//   }
// }

// await main();
