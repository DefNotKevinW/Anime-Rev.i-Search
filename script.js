/*
PRIORITY TODO:
- add a time-out for searching
- some anime don't have complete information in the anilist api (ex. id 101369)
*/

document.addEventListener("DOMContentLoaded", () => {
	document.querySelector("header").style.height = "100vh";
});

let animes;

document.addEventListener("click", (e) => {
	e = e || window.event;
	let target = e.target;
	if (target.classList.contains("resultCardImg")) {
		startLoader();
		resetPage(fullReset = false);
		setFocusedAnime(animes[parseInt(target.id)]);
	}
}, false);

/* This code chunk handles file uploads (file drag + drop) */
let dropArea = document.querySelector(".dropArea");

['dragenter', 'dragover'].forEach(eventName => {
	dropArea.addEventListener(eventName, highlight, false);
});
  
['dragleave', 'drop'].forEach(eventName => {
	dropArea.addEventListener(eventName, unhighlight, false);
});

dropArea.addEventListener('drop', handleDrop, false);

function highlight(e) {
	e.preventDefault();
	e.stopPropagation();
	document.querySelector(".innerHeaderWrapper").classList.add("drag");
	document.querySelector(".innerHeaderWrapper").classList.add("highlight");
}
  
function unhighlight(e) {
	e.preventDefault();
	e.stopPropagation();
	document.querySelector(".innerHeaderWrapper").classList.remove("drag");
	document.querySelector(".innerHeaderWrapper").classList.remove("highlight");
}

function handleDrop(e) {
	let files = e.dataTransfer.files;
	startLoader();
	try {
		// clear search bar
		document.querySelector(".searchbar").value = "";

		handleFiles(files);
		gatherData();
	}
	catch(err) {
		stopLoader();
		alert(err);
	}
}

function handleFiles(files) {
	document.getElementById("myImg").src = URL.createObjectURL(files[0]);
} 

function manualUpload(files) {
	startLoader();
	try {
		// clear search bar
		document.querySelector(".searchbar").value = "";

		handleFiles(files);
		gatherData();
	}
	catch(err) {
		stopLoader();
		alert(err);
	}
}

/* This code chunk handles ctrl + v from clipboard */

document.addEventListener("paste", ev => {
	let item = ev.clipboardData.items[0];

	if (item.type.startsWith("image/")) { /// We are only interested in clipboard data that is an image
		/// Do something with the data, image available as `item.getAsFile()`
		document.getElementById("myImg").src = URL.createObjectURL(item.getAsFile());
	}
	else {
		item.getAsString(s => {
			document.getElementById("myImg").src = s;
		});
	}
	// clear search bar
	document.querySelector(".searchbar").value = "";

	startLoader();
	gatherData();
});

/* resets page and gathers all picture info to send it to apis */
function gatherData() {
	resetPage();
	getImgInfo();
}

/* This code chunk handles search bar inputs */
document.querySelector(".searchbar").addEventListener("keyup", (e) => {
	// check for enter button pressed
	if (e.code == "Enter") {
		console.log(e.target.value);
		handleSearchInput(e.target.value);
	}
});

function submitSearchValue() {
	handleSearchInput(document.querySelector(".searchbar").value);
}

function handleSearchInput(str) {
	startLoader();
	try {
		document.getElementById("myImg").src = str;
		resetPage();
		getImgInfo();
	}
	catch(err) {
		stopLoader();
		alert(err);
	}
}

/* sends an error to the user if the provided image isn't correct in some way */

document.getElementById("myImg").addEventListener("error", (e) => {
	// let the user know that the pasted url isn't valid
	console.log(e);
	stopLoader();
	alert("Invalid link!");
});

/* Collects data from APIs */

function getImgInfo() {
	document.getElementById("myImg").onload = () => {
		let img = document.getElementById("myImg"); // select image from DOM
		let canvas = document.createElement("canvas");
		canvas.width = img.naturalWidth;
		canvas.height = img.naturalHeight;
		let ctx = canvas.getContext("2d");
		ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

		fetch("https://trace.moe/api/search", {
			method: "POST",
			body: JSON.stringify({ image: canvas.toDataURL("image/jpeg", 0.8) }),
			headers: { "Content-Type": "application/json" },
		})
		.then((response) => response.json())
		.then((result) => {
			animes = result.docs;
			console.log(animes);
			getAnimeScene(animes);
		})
		.catch(err => {
			console.log(err);
		});
	}
}

function getAnimeScene(animes) {
	if (animes[0].similarity >= 0.87) {
		// set the first anime in the list to be focused
		setFocusedAnime(animes[0]);
		for (let i = 0; i < animes.length; i++) {
			if (animes[i].similarity >= 0.87) {
				let card = document.createElement("div"), 
					img = document.createElement("img"),
					title = document.createElement("li"),
					episode = document.createElement("li"),
					sim = document.createElement("li"),
					details = document.createElement("ul");
				
				// adding classes
				card.setAttribute("class", "hFlex card");
				img.setAttribute("id", String(i));
				img.setAttribute("class", "resultCardImg");

				img.src = "https://media.trace.moe/image/" + 
				String(animes[i].anilist_id) + "/" + encodeURIComponent(animes[i].filename) + 
				"?t=" + String(animes[i].at) + "&token=" + animes[i].tokenthumb + "&size=s";
				img.width = "160";
				img.height = "90";

				try {
					title.appendChild(document.createTextNode(formatString(animes[i].title_english)));
				} catch {
					title.appendChild(document.createTextNode(animes[i].title));
				}
			
				episode.appendChild(document.createTextNode("Episode " + animes[i].episode));

				sim.appendChild(document.createTextNode("Similarity: " + 
														Math.round(animes[i].similarity * 10000) 
														/ 100 + "%"));

				details.appendChild(title);
				details.appendChild(episode);
				details.appendChild(sim);

				card.appendChild(img);
				card.appendChild(details);

				document.getElementById("animeList").appendChild(card);
			}
		}
		switchToMainContent();
	}
	else {
		// let the user know that no matches were found
		resetPage();
		document.getElementById("errorMessage").innerHTML = `No Anime were found. Please ensure your image does 
		not contain any watermarks, added effects, or borders that are not from the original source. Also ensure
		that the image contains as much of the original content as possible.`;
		stopLoader();
	}
	
}

function setFocusedAnime(anime) {
	// add in the clip where the image is found
	document.getElementById("myVid").src="https://media.trace.moe/video/" + 
		String(anime.anilist_id) + "/" + encodeURIComponent(anime.filename) + 
		"?t=" + String(anime.at) + "&token=" + anime.tokenthumb + "&size=l";

	// set the title
	if (anime.title_english !== null) {
		document.getElementById("focusedTitle").innerHTML = formatString(anime.title_english);
	}
	else {
		document.getElementById("focusedTitle").innerHTML = anime.title;
	}
	// set the subtitle (english title)
	document.getElementById("focusedSubtitle").innerHTML = anime.title;

	getAnimeDetails(anime.anilist_id);
}

function getAnimeDetails(animeId) {
	let query = `
	query ($id: Int) {
	  Media(id: $id, type: ANIME) {
		startDate {
		  year
		  month
		  day
		}
		bannerImage
		coverImage {
		  large
		}
		source
		duration
		status
		season
		episodes
		isAdult
		genres
		description
		characters(sort: [ROLE, FAVOURITES_DESC]) {
		  edges {
			role
			voiceActors(sort: LANGUAGE) {
			  name {
				full
				native
			  }
			  image {
				medium
			  }
			}
			node {
			  image {
				medium
			  }
			  name {
				full
				native
			  }
			}
		  }
		}
		externalLinks {
		  site
		  url
		}
		studios(isMain: true) {
		  nodes {
			name
		  }
		}
	  }
	}
	`;

	const variables = {
		id: animeId
	};
	const url = "https://graphql.anilist.co",
		options = {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Accept': 'application/json',
			},
			body: JSON.stringify({
				query: query,
				variables: variables
			})
		};
	
	// Make the HTTP Api request
	fetch(url, options)
		.then(response => {return response.json()})
		.then(result => {
			const data = result.data.Media;
			// we need to set some details here.
			setAnimeCover(data.coverImage.large, data.bannerImage);
			setAnimeSynopsis(data.description);
			setAnimeGenreList(data.genres);
			setAnimeDates(data.startDate);
			setAnimeSeason(data.season, data.startDate.year);
			setAnimeCharacters(data.characters.edges);
			setAnimeDuration(data.duration);
			setAnimeEpisodes(data.episodes);
			setAnimeStatus(data.status);
			setAnimeStudios(data.studios.nodes);
			setAnimeSource(data.source);
			//setAnimeLinks(data.externalLinks);
			stopLoader();
			//document.querySelector(".searchContainer").scrollIntoView();
		})
		.catch(err => console.log(err));
}

function setAnimeSynopsis(desc) {
	document.getElementById("synopsis").innerHTML = desc;
}

function setAnimeGenreList(genres) {
	let list = document.getElementById("genreList");

	genres.forEach(genre => {
		let li = document.createElement("li");
		li.appendChild(document.createTextNode(genre));
		list.appendChild(li);
	});
}

function setAnimeDates(startDate) {
	const start = startDate.day + "/" + startDate.month + "/" + startDate.year;
	document.getElementById("startDate").innerHTML = start;
}

function setAnimeSeason(season, year) {
	document.getElementById("season").innerHTML = formatString(season) + " " + year;
}

function setAnimeCharacters(characterList) {
	let list = document.getElementById("characterList");
	
	characterList.slice(0, 12).forEach(ch => {
		let card = document.createElement("li"),
			chContainer = document.createElement("ul"),
            chImgContainer = document.createElement("li"),
			chImg = document.createElement("img"),
            chSubContainer = document.createElement("ul"),
			chName = document.createElement("li"),
			chRole = document.createElement("li"),
			vaContainer = document.createElement("ul"),
			vaName = document.createElement("li"),
            vaImgContainer = document.createElement("li"),
			vaImg = document.createElement("img");
		
		// first we work with the character information
		chImg.src = ch.node.image.medium;
		chName.innerHTML = ch.node.name.full;
        chRole.innerHTML = formatString(ch.role);
        chImgContainer.appendChild(chImg);
        chContainer.appendChild(chImgContainer);
        chSubContainer.appendChild(chName);
        chSubContainer.appendChild(chRole);
        chContainer.appendChild(chSubContainer);

        // now we work with voice actor information
        vaImg.src = ch.voiceActors[0].image.medium;
		vaName.innerHTML = ch.voiceActors[0].name.full;
        vaImgContainer.appendChild(vaImg);
        vaContainer.appendChild(vaName);
        vaContainer.appendChild(vaImgContainer);

        // append character and voice actor information to the card
        card.appendChild(chContainer);
        card.appendChild(vaContainer);

        // add classes
        card.setAttribute("class", "hFlex chCard");
        vaContainer.setAttribute("class", "hFlex chRight");
        chContainer.setAttribute("class", "hFlex chLeft");
        chSubContainer.setAttribute("class", "vFlex chDetails");
		chImg.setAttribute("class", "chCardImage");
		vaImg.setAttribute("class", "chCardImage");
		vaName.setAttribute("class", "vaName");

        list.appendChild(card);
	});
}

function setAnimeCover(cover, banner) {
	document.getElementById("mainCoverImg").src = cover;
	if (banner !== null) {
		//document.querySelector(".animeBanner").style.backgroundImage = "url(" + banner + ")";
	}
	else {
		//document.querySelector(".animeBanner").style.backgroundImage = "url()";
		//document.querySelector(".animeBanner").style.backgroundColor = "#212121";
	}
	
}

function setAnimeDuration(duration) {
	document.getElementById("duration").innerHTML = duration + " Minutes";
}

function setAnimeEpisodes(episodes) {
	document.getElementById("episodes").innerHTML = episodes;
}

function setAnimeStatus(status) {
	document.getElementById("status").innerHTML = formatString(status);
}

function setAnimeStudios(studios) {
	let list = document.getElementById("studios");

	studios.forEach(studio => {
		let li = document.createElement("li");
		li.appendChild(document.createTextNode(studio.name));
		list.appendChild(li);
	});
}

function setAnimeSource(source) {
	document.getElementById("source").innerHTML = formatString(source);
}

function setAnimeLinks(links) {
	let list = document.getElementById("externalLinks");

	genres.forEach(genre => {
		let li = document.createElement("li");
		li.appendChild(document.createTextNode(genre));
		list.appendChild(li);
	});
}

function formatString(string) {
	let split = string.toLowerCase().split(" "),
		result = "";

	for (let i = 0; i < split.length - 1; i++) {
		result = result + split[i][0].toUpperCase() + 
			split[i].slice(1, split[i].length) + " ";
	}

	return result + split[split.length-1][0].toUpperCase() + 
		split[split.length-1].slice(1, split[split.length-1].length); 
}

/* loading related */
function startLoader() {
	document.querySelector(".loaderCover").style.display = "flex";
	document.getElementById("loader").classList.add("lds-blocks");
}

function stopLoader() {
	document.querySelector(".loaderCover").style.display = "none";
	document.getElementById("loader").classList.remove("lds-blocks");
}

function switchToMainContent() {
	let main = document.querySelector(".mainContent"),
		header = document.querySelector("header");
	
	// change header styling
	header.style.removeProperty("height");
	header.style.backgroundImage = "none";

	// change upload box styling

	// change main content styling
	main.style.display = "flex";
}

function resetPage(fullReset = true) {
	if (fullReset) {
		document.querySelector(".mainContent").style.display = "none";
		document.getElementById("animeList").innerHTML = "";
	}

	// reset error message
	document.getElementById("errorMessage").innerHTML = "";

	// reset genre list
	document.getElementById("genreList").innerHTML = "";

	// reset character list
	document.getElementById("characterList").innerHTML = "";

	// reset studio list
	document.getElementById("studios").innerHTML = "";

	// reset banner and cover image
	//document.querySelector(".animeBanner").src = "";
	document.getElementById("mainCoverImg").src = "";
}