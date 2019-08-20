

let $map = document.querySelector('#map')

class GoogleMap{

  constructor(){
    this.map = null
    this.bounds = null
  }


  /*
  - charge la carte sur un element HTML
  - @param {HTML Element} element
  */
  async load(element){
    return new Promise((resolve,reject)=>{
      $script('https://maps.googleapis.com/maps/api/js', function(){
        let center = {lat:-25.363, lng:131.044}
        let map = new google.maps.Map(element,{zoom: 4, center: center})
      })
      resolve()
    })

  }

  /**
  @param : {String} lat : Latitude
  @param : {String} lon : Longitude
  @param : {String} txt : Texte
  @return : {textMarker} Marker : marker
  */
  addMarker(lat, lon, txt){
    let point = new google.maps.LatLng(lat,lon)
    let marker = new google.maps.Marker({
      position: {lat:lat, lng:lon},
      map: this.map
    })
    this.bounds(point)
    return marker
  }

  /**
  * Centrer la map
  */
  centerMap(){
    this.map.panToBounds(this.bounds)
    this.map.fitBounds(this.bounds)
  }
}

class GoogleMapMarker(){

}

const initMap = async function(){
  let map = new GoogleMap()
  await map.load($map)
  Array.from(document.querySelectorAll('.js-coordonates')).forEach(function(item){
    map.addMarker(item.dataSet.lat, item.dataSet.lon, item.dataSet.txt + '€')
    item.addEventListerner('mouseover', function(){

    })
  })
  map.centerMap()
}
if($map !== null){
  initMap()
}
