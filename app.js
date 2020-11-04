
const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const ent = require('ent');
const MongoClient = require('mongodb').MongoClient;
const math = require('mathjs');
const parseJson = require('parse-json');
const cov = require('compute-covariance');
//var Highcharts = require('highcharts');
//require('highcharts/modules/exporting.js')(Highcharts);

const urldb = "mongodb://localhost:27017/";

// page par default : index.html
app.get('/', function (req, res) {
	res.setHeader('Content-Type','text/html');
	res.sendFile(__dirname + '/public/index.html');
});
app.use(express.static(__dirname + '/public'));


pente = function(array2d){
	// Calcul de la pente ramenée au Semestre
	var array1= [];var array2 = [];
	array2d.forEach(function(e,index,objet){
		// separation des X et des Y
		array1.push(e[0]);
		array2.push(e[1]);
	});
	// formule : a = cov(X,Y)/Var(X)
	const pente = cov(array1,array2)[0][1]/math.variance(array1);
	//console.log(pente*15778800000);
	return pente*15778800000;
}

// Evenements webSocket
io.sockets.on('connection', function (socket) {
    console.log('Un client est connecté !');


	// requete
	socket.on('request', function (obj) {
		// log de la requete
		/*
		attributs de l'objets requête :
					- typlog: type de logement (Maison, Appartement etc.)
					- cp : codePostal ou debut de Code Postal
					- smin : surface Habitable minimale
					- smax : surface Habitable MAximale
					- smint : surface Terrain minimale
					- smaxt : surface Terrain Maximale
					- nbpce : nombre de pièces principales
					- typprix : prixAuM2 (true) | Valeur Foncière (false)
		*/

		// gestion surface Terrain
		if (obj.smaxt === null) {
				var ssRqtSMinT = {$type: [1,2,6,10,16,18,19]};
		}else{
			var ssRqtSMinT = {$gt: parseInt(obj.smint)-1, $lt: parseInt(obj.smaxt)+1};
		}


		// gestion label highcharts sur l'abscisse
		console.log(typeof(obj.typprix));
		switch(obj.typprix) {
			case true:
				var labelPrix = '€/m²';
				break;
			case false:
				var labelPrix = '€';
				break;
		}

		// gestion nombre de pièces
		if(obj.nbpce == 5){
			// regexp : >= 5
			var ssrqtNbPce = { $gt: 4};
		}else if(obj.nbpce == 0){
			var ssrqtNbPce = { $gt : 0};
		}
		else{
			var ssrqtNbPce = parseInt(obj.nbpce);
		}

		// gestion type logement :
		if(obj.typlog == "a"){
			// autre que Maison ou Appartement
			var ssrqtLog = {$not: { $in:["1","2"]}};
		}else if(obj.typlog == "t"){
			// tout type de logement
			var ssrqtLog = new RegExp('^[0-9]{0,}$');
		}else{
			var ssrqtLog = obj.typlog;
		}

		//contruction du regexp : Code Postal
		regex = new RegExp('^'+obj.cp+'.*');

		// requete mongodb
		MongoClient.connect(urldb,{ useNewUrlParser: true }, function(err, db) {
			  if (err) throw err;
			  // construction de la requete :

			  query = {surfaceTerrain: ssRqtSMinT,nbPiecePrincipales : ssrqtNbPce,codeTypeLocal: ssrqtLog, codePostal : regex, surfaceReelle : {"$lt" : parseFloat(obj.smax), "$gt" : parseFloat(obj.smin)}, prixM2Bati: {$ne: null}, dateMutation: {$ne: null}};
			  console.log(query);

			  // database local
				var dbo = db.db("local");
			  // collection immobilier
			  dbo.collection("immobilier").find(query).toArray(function(err, result) {
				if (err) throw err;
				console.log(result.length);
				db.close();

				var prix_maisons = [];
				var prix_apparts = [];
				var prix_autres = [];
				// découpage par categorie de logement
				for (var n = 0; n < result.length; n++){
					if(result[n].typeLocal == "Maison"){
						switch (obj.typprix) {
							case true:
								prix_maisons.push([new Date(result[n].dateMutation).getTime(),result[n].prixM2Bati]);
								break;
							default:
								prix_maisons.push([new Date(result[n].dateMutation).getTime(),result[n].valeurFonciere]);
						}
					}else if(result[n].typeLocal == "Appartement"){
						switch (obj.typprix) {
							case true:
								prix_apparts.push([new Date(result[n].dateMutation).getTime(),result[n].prixM2Bati]);
								break;
							default:
								prix_apparts.push([new Date(result[n].dateMutation).getTime(),result[n].valeurFonciere]);
						}
					}else{
						switch (obj.typprix) {
							case true:
								prix_autres.push([new Date(result[n].dateMutation).getTime(),result[n].prixM2Bati]);
								break;
							default:
								prix_autres.push([new Date(result[n].dateMutation).getTime(),result[n].valeurFonciere]);
						}
					}
				}

				//calcul pente
				var pente_apparts,pente_autres,pente_maisons;
				if(prix_maisons.length > 1){
					var reg_maisons = true;
					pente_maisons = pente(prix_maisons);
				}else{
					var reg_maisons = false;
					pente_maisons = null;
				}
				if(prix_apparts.length > 1){
					var reg_apparts = true;
					pente_apparts = pente(prix_apparts);
				}else{
					var reg_apparts = false;
					pente_apparts = null;
				}
				if(prix_autres.length > 1){
					var reg_autres = true;
					pente_autres = pente(prix_autres);
				}else{
					var reg_autres = false;
					pente_autres = null;
				}

				//console.log('pente maison : '+pente_maisons);
				//console.log('pente appart : '+pente_apparts);
				//console.log('pente autre : '+pente_autres);
				// envoi vers le front
				socket.emit("data",{priceType: labelPrix, dataHouse: prix_maisons, dataFlat: prix_apparts, dataOther: prix_autres, regressions: [reg_maisons,reg_apparts,reg_autres], pentes: [pente_maisons,pente_apparts,pente_autres]});

				// calcul mediane
				var boxPlotdata = [];
				var boxPlotCategories = [];
				var myArray = [];
				const sixMonths = 15778800000;
				//var q1, median, q3 = 0;
				var semestre = [];
				// decoupage par semestre

				// découpage par semestres
				for (var ts = new Date('2014').getTime(); ts < new Date().getTime(); ts+=sixMonths){
					result.forEach(function (line){
						switch (obj.typprix) {
							case true:
								if(new Date(line.dateMutation).getTime() > ts && new Date(line.dateMutation).getTime() < (ts+sixMonths) && line.prixM2Bati != null){
									myArray.push(line.prixM2Bati);
								}
								break;
							case false:
								if(new Date(line.dateMutation).getTime() > ts && new Date(line.dateMutation).getTime() < (ts+sixMonths) && line.valeurFonciere != null){
									myArray.push(line.valeurFonciere);
								}
								break;
						}

					});

					if(myArray.length > 2){
						var std = math.std(myArray);
						var mean = math.mean(myArray);
						//console.log('mean: '+mean);

						// suppression des valeurs aberrantes
						myArray.forEach(function (e,index,array){
							if(Math.abs(e - mean) > 1.5*std){// 2*std = 0.9545
								array.splice(index,1);
							}
						});
						// q1 q2 q3 du semestre en cours
						if(myArray.length > 2){
							var quantiles = (math.quantileSeq(myArray,[0.1,0.25,0.5,0.75,0.9]));
							boxPlotCategories.push(new Date(ts).toISOString());
							boxPlotdata.push(quantiles);
						}
					}
					myArray = [];
				}

				socket.emit("stats_basic",{priceType: labelPrix, categories : boxPlotCategories, data : boxPlotdata});
		  });
		});
	});
});


server.listen(8080);
