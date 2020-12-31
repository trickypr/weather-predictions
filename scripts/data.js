const {
  createReadStream,
  readFileSync,
  writeFileSync,
  rmdirSync,
  readdirSync,
} = require('fs')
const { join, extname } = require('path')
const unzip = require('unzipper')
const { parse } = require('papaparse')

const { log } = console

const dataPoints = 365

;(async () => {
  log('Unzipping data files...')

  await createReadStream(join(__dirname, 'rain.zip'))
    .pipe(unzip.Extract({ path: join(__dirname, 'temp/rain') }))
    .promise()

  await createReadStream(join(__dirname, 'temp.zip'))
    .pipe(unzip.Extract({ path: join(__dirname, 'temp/temperature') }))
    .promise()

  log('Parsing files...')

  let rainRaw = ''
  readdirSync(join(__dirname, 'temp/rain'))
    .filter((file) => extname(file) === '.csv')
    .forEach(
      (file) =>
        (rainRaw = readFileSync(join(__dirname, 'temp/rain', file)).toString())
    )

  let tempRaw = ''
  readdirSync(join(__dirname, 'temp/temperature'))
    .filter((file) => extname(file) === '.csv')
    .forEach(
      (file) =>
        (tempRaw = readFileSync(
          join(__dirname, 'temp/temperature', file)
        ).toString())
    )

  const rainCSV = parse(rainRaw, { header: true }).data
  const tempCSV = parse(tempRaw, { header: true }).data

  const data = {}

  rainCSV
    .filter((e) => e['Rainfall amount (millimetres)'] != '')
    .filter((e) => typeof e['Month'] != 'undefined')
    .forEach(
      (e) =>
        (data[`${e.Year}_${e.Month}_${e.Day}`] = {
          Month: e.Month,
          rain: Number(e['Rainfall amount (millimetres)']),
        })
    )

  tempCSV
    .filter((e) => e['Maximum temperature (Degree C)'] != '')
    .filter((e) => typeof e['Month'] != 'undefined')
    .filter((e) => typeof data[`${e.Year}_${e.Month}_${e.Day}`] != 'undefined')
    .forEach(
      (e) =>
        (data[`${e.Year}_${e.Month}_${e.Day}`].temp = Number(
          e['Maximum temperature (Degree C)']
        ))
    )

  let final = []

  for (const day in data) {
    final.push(data[day])
  }

  final = final.reverse().filter((e, i) => i < dataPoints)

  writeFileSync(
    join(__dirname, '..', 'src', 'training_data.json'),
    JSON.stringify(final)
  )

  log('Cleaning up...')
  rmdirSync(join(__dirname, 'temp'), { recursive: true })
})()
