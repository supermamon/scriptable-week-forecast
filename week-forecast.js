// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: pink; icon-glyph: sun;

/* -----------------------------------------------
Script      : week-forecast.js
Author      : dev@supermamon.com
Version     : 1.0.0
Description :
  A widget script to display the week's weather 
  forecast

Requested from Reddit:
https://www.reddit.com/r/Scriptable/comments/jzxgtv/is_there_any_script_for_widget_of_week_long_that/

Changelog   :
v1.0.0
- Initial release
----------------------------------------------- */

// REQUIRED!!
// you need an Open Weather API key.
// Get one for free at: https://home.openweathermap.org/api_keys

// you can save API keys on another file so you 
// don't need to keep copying and pasting the 
// key. Bonus is you only need to change it to
// on place if it changes
const keys = await importModuleOptional('api-keys')

// replace YOUR_API_KEY with the actual key you receive
const API_KEY =  keys ? keys.OpenWeatherMap : 'YOUR_API_KEY'

// choose between metric, imperial, standard
const UNITS = 'metric'

// number of days to show in the forecast
const MAX_DAYS = 5

// best to use a monospace font for alignment
const GLOBAL_FONT = 'Menlo-Regular'

// this will auto-detect location. If you wish 
// to provide specific location add a lat & lon 
// value. 
const weatherData = await getOpenWeatherData({appid: API_KEY, 
  units: UNITS,
  reversegeocode: true  
})
// example with specific location
/*
const weatherData = await getOpenWeatherData({appid: API_KEY, 
  units: UNITS,
  lat: 37.32,
  lon: -122.03
})
*/

const widget = await createWidget(weatherData.daily, config.widgetFamily)
Script.setWidget(widget)
Script.complete()
if (config.runsInApp) {
  await widget.presentMedium()
}

//------------------------------------------------
async function createWidget(data, widgetFamily='medium') {
  log(`days = ${data.length}`)

  const fontSize = widgetFamily=='small'?9:15
  const useFont = new Font(GLOBAL_FONT, fontSize)

  
  const widget = new ListWidget()
  widget.backgroundGradient = newLinearGradient([`#277baeee`,`#277baeaa`],[0,.8])
  for (var i=0; i<data.length && i < MAX_DAYS; i++) {
    const cond = data[i]

    var date = new Date(cond.dt*1000)
    var df = new DateFormatter()
    df.dateFormat = widgetFamily=='small'?'eee':'eeee'

    const hstack = widget.addStack()
    hstack.layoutHorizontally()

    const dayName = df.string(date).padEnd(10, ' ')

    const day = hstack.addText(dayName)
    day.font = useFont
    
    hstack.addSpacer()

    const sf = SFSymbol.named(cond.weather[0].sfsymbol)
    sf.applyFont(useFont)
    const icon = hstack.addImage(sf.image)
    icon.tintColor = Color.white()
    icon.resizable = false

    hstack.addSpacer(5)

    const pop = `${Math.round(cond.pop * 100)}%`.padStart(4,' ')
    const chance = hstack.addText(pop)
    chance.font = useFont

    hstack.addSpacer()

    const min = `${Math.round(cond.temp.min)}`.padEnd(3,' ')
    const minTxt = hstack.addText(min)
    minTxt.font = useFont

    hstack.addSpacer(5)

    const max = `${Math.round(cond.temp.max)}`.padEnd(3,' ')
    const maxTxt = hstack.addText(max)
    maxTxt.font = useFont

  }

  return widget

}

//------------------------------------------------
function newLinearGradient(hexcolors, locations) {
  let gradient = new LinearGradient()
  gradient.locations = locations
  gradient.colors = hexcolors
                     .map(color=>new Color(color))
  return gradient
}

async function importModuleOptional(module_name) {
    const ICLOUD =  module.filename
                      .includes('Documents/iCloud~')
    const fm = FileManager[ICLOUD 
                            ? 'iCloud' 
                            : 'local']()
    if (!/\.js$/.test(module_name)) {
      module_name = module_name + '.js'
    }
    const module_path = fm.joinPath
                          (fm.documentsDirectory(), 
                          module_name)
    if (!fm.fileExists(module_path)) {
      log(`module ${module_name} does not exist`)
      return null
    }
    if (ICLOUD) {
      await fm.downloadFileFromiCloud(module_path)
    }
    const mod = importModule(module_name)
    return mod
}

//------------------------------------------------
// https://github.com/supermamon/scriptable-scripts/tree/master/openweathermap
async function getOpenWeatherData({
  appid='',
  units='metric',
  lang='en',
  exclude='minutely,alerts',
  revgeocode=false,
  ...more
}) {

  var opts = {appid, units, lang, exclude, revgeocode, ...more}                  
  
  
  // validate units
  if (!(/metric|imperial|standard/.test(opts.units))) {
    opts.units = 'metric'
  }

  // if coordinates are not provided, attempt to
  // automatically find them
  if (!opts.lat || !opts.lon) {
    log('cordinates not provided. detecting...')
    try {
      var loc = await Location.current()
      log('successfully detected')
    } catch(e) {
      log('unable to detect')
      throw new Error('Unable to find your location.')
    }
    opts.lat = loc.latitude
    opts.lon = loc.longitude
    log(`located lat: ${opts.lat}, lon: ${opts.lon}`)
  }

  // ready to fetch the weather data
  let url = `https://api.openweathermap.org/data/2.5/onecall?lat=${opts.lat}&lon=${opts.lon}&exclude=${opts.exclude}&units=${opts.units}&lang${opts.lat}&appid=${opts.appid}`
  let req = new Request(url)
  let wttr = await req.loadJSON()
  if (wttr.cod) {
    throw new Error(wttr.message)
  }
  
  // add some information not provided by OWM
  wttr.tempUnit = opts.units == 'metric' ?
                           'C' : 'F'

  const currUnits = {
    standard: {
      temp: "K",
      pressure: "hPa",
      visibility: "m",
      wind_speed: "m/s",
      wind_gust: "m/s",
      rain: "mm",
      snow: "mm"      
    } ,
    metric: {
      temp: "C",
      pressure: "hPa",
      visibility: "m",
      wind_speed: "m/s",
      wind_gust: "m/s",
      rain: "mm",
      snow: "mm"      
    },
    imperial: {
      temp: "F",
      pressure: "hPa",
      visibility: "m",
      wind_speed: "mi/h",
      wind_gust: "mi/h",
      rain: "mm",
      snow: "mm"      
    }
  }

  wttr.units = currUnits[opts.units]

  if (opts.revgeocode) {
    log('reverse geocoding...')
    var geo = await Location.reverseGeocode(opts.lat, opts.lon)
    if (geo.length) {
      wttr.geo = geo[0]
    }
  }

  //----------------------------------------------
  // SFSymbol function
  // Credits to @eqsOne | https://talk.automators.fm/t/widget-examples/7994/414
  // Reference: https://openweathermap.org/weather-conditions#Weather-Condition-Codes-2
  const symbolForCondition = function(cond,night=false){
    let symbols = {
    // Thunderstorm
      "2": function(){
        return "cloud.bolt.rain.fill"
      },
    // Drizzle
      "3": function(){
        return "cloud.drizzle.fill"
      },
    // Rain
      "5": function(){
        return (cond == 511) ? "cloud.sleet.fill" : "cloud.rain.fill"
      },
    // Snow
      "6": function(){
        return (cond >= 611 && cond <= 613) ? "cloud.snow.fill" : "snow"
      },
    // Atmosphere
      "7": function(){
        if (cond == 781) { return "tornado" }
        if (cond == 701 || cond == 741) { return "cloud.fog.fill" }
        return night ? "cloud.fog.fill" : "sun.haze.fill"
      },
    // Clear and clouds
      "8": function(){
        if (cond == 800) { return night ? "moon.stars.fill" : "sun.max.fill" }
        if (cond == 802 || cond == 803) { return night ? "cloud.moon.fill" : "cloud.sun.fill" }
        return "cloud.fill"
      }
    }
    // Get first condition digit.
    let conditionDigit = Math.floor(cond / 100)
    return symbols[conditionDigit]()
    
  }

  // find the day that matched the epoch `dt`
  var findDay = function(dt) {
    return wttr.daily.filter( daily => {
      var hDate = new Date( 1000 * dt )
      var dDate = new Date( 1000 * daily.dt )
      return (
        hDate.getYear() == dDate.getYear() && 
        hDate.getMonth() == dDate.getMonth() &&  
        hDate.getDate() == dDate.getDate())
    })[0]
  }
  
  // tell whether it's night or day
  var day = findDay(wttr.current.dt)
  
  wttr.current.is_night = (
    wttr.current.dt > day.sunset || 
    wttr.current.dt < day.sunrise)

    wttr.current.weather[0].sfsymbol = 
    symbolForCondition(
      wttr.current.weather[0].id,
      wttr.current.is_night)

    let wicon = wttr.current.weather[0].icon
    wttr.current.weather[0].icon_url = 
      `http://openweathermap.org/img/wn/@2x.png${wicon}`

  wttr.hourly.map( hourly => {

    var day = findDay(hourly.dt)
    hourly.is_night  = (
      hourly.dt > day.sunset || 
      hourly.dt < day.sunrise)

    hourly.weather[0].sfsymbol = 
      symbolForCondition(
        hourly.weather[0].id, 
        hourly.is_night)

      let wicon = hourly.weather[0].icon
      hourly.weather[0].icon_url = 
        `http://openweathermap.org/img/wn/@2x.png${wicon}`
    
    return hourly
  })

  wttr.daily.map( daily => {

    daily.weather[0].sfsymbol = 
      symbolForCondition(
        daily.weather[0].id, 
        false)

      let wicon = daily.weather[0].icon
      daily.weather[0].icon_url = 
        `http://openweathermap.org/img/wn/@2x.png${wicon}`
    
    return daily
  })


  // also return the arguments provided
  wttr.args = opts

  //log(wttr)
  return wttr

}