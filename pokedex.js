// Name: Ruolu Ye
// Date: May 7th 2019
// Section: CSE 154 AL
//
// this pokedex.js allows user interaction with the webpage pokedex.html
// to play pokemon battles. 

(function() {
  "use strict";

  // the base url of pokedex
  const API_URL = "https://courses.cs.washington.edu/courses/cse154/webservices/pokedex/";

  const POKEDEX_URL = "pokedex.php"; //the pokedex server url
  const GAME_URL = "game.php"; //the game server url
  const SPRITES = "sprites/"; // the sprites url
  const ICON = "icons/"; // the icon url
  const lowHealthPercentage = 20; // the number of percentage representing low-health
  const makePercentage = 100; // multiply to make a number into percentage number
  // the array of all default pokemon that is already found at the beginning of the game
  const defaultPokemon = ["charmander", "bulbasaur", "squirtle"];

  let guid = ""; //the game id of the current game
  let pid = ""; // the player id of the current game
  let myPokemonHP = ""; // the currrent pokemon's orginial HP

  /**
   *  When the webpage loads, initialize the pokedex game
   */
  window.addEventListener("load", init);

  /**
   * demonstrate the initial pokedex view from the pokedex server and
   * catch error if there is one
   */
  function init() {
    id("endgame").addEventListener("click", backToPokedex);
    id("flee-btn").addEventListener("click", attack);
    id("start-btn").addEventListener("click", gameView);
    let url = API_URL + POKEDEX_URL + "?pokedex=all";
    fetch(url)
      .then(checkStatus)
      .then(intitialView)
      .catch(console.error);
  }

  /**
   * initialize the pokedex view with all pokemon but squirtle, charmander,
   * and bulbasaur in black shadow
   * @param {object} pokemonInfo the text of all pokemons' names
   */
  function intitialView(pokemonInfo) {
    let pokemons = pokemonInfo.split("\n");
    for (let i = 0; i < pokemons.length; i++) {
      let pokemon = pokemons[i].split(":");
      let shortName = pokemon[1];
      let img = document.createElement("img");
      img.classList.add("sprite");
      img.src = API_URL + SPRITES + shortName + ".png";
      img.alt = pokemon[0];
      img.id = shortName;
      for (let i = 0; i <defaultPokemon.length; i++) {
        if (shortName === defaultPokemon[i]) {
          foundPokemon(img);
        }
      }
      id("pokedex-view").appendChild(img);
    }
  }

  /**
   * Get the info of the chosen pokemon from the server and show the button
   * that starts the pokemon battle
   * catch the error if there is one
   */
  function getCardInfo() {
    let url = API_URL + POKEDEX_URL + "?pokemon=" + this.id;
    fetch(url)
      .then(checkStatus)
      .then(JSON.parse)
      .then(prepare)
      .catch(console.error);
    id("start-btn").classList.remove("hidden");
  }

  /**
   * populate the card on screen with the chosen or random rival pokemon's
   * information and prepare the game.
   * @param {object} pokemonInfo the text version of pokemon's data
   */
  function prepare(pokemonInfo) {
    let cardId;
    if (pokemonInfo["guid"]) {
      cardId = "#p2";
      guid = pokemonInfo["guid"];
      pid = pokemonInfo["pid"];
      pokemonInfo = pokemonInfo["p2"];
    } else {
      cardId = "#p1";
      myPokemonHP = pokemonInfo["hp"];
    }
    let moveBtns = qsa(cardId + " .moves button");
    removeClass(moveBtns, "hidden");
    qs(cardId + " .name").innerText = pokemonInfo["name"];
    let images = pokemonInfo[ "images"];
    qs(cardId + " .pokepic").src = API_URL + images["photo"];
    qs(cardId + " .type").src = API_URL + images["typeIcon"];
    qs(cardId + " .weakness").src = API_URL + images["weaknessIcon"];
    qs(cardId + " .hp").innerText = pokemonInfo["hp"] + "HP";
    qs(cardId + " .info").innerText = pokemonInfo["info"]["description"];
    let moves = qsa(cardId + " .move");
    let dps = qsa(cardId + " .dp");
    let moveTypes = qsa(cardId + " .moves img");
    let pokemonMoves = pokemonInfo["moves"];
    showMoves(moves, dps, moveTypes, pokemonMoves);
    for (let j = pokemonMoves.length; j < moveBtns.length; j++) {
      moveBtns[j].classList.add("hidden");
    }
  }

  /**
   * initialize the pokemons battle view with an additional rival pokemon's
   * card on screen right by getting the random rival's data from the server
   * shows the button for flee option. catch an error if there is one
   */
  function gameView() {
    let url = API_URL + GAME_URL;
    let data = new FormData();
    data.append("startgame", true);
    data.append("mypokemon", qs("#p1 .name").innerText);
    fetch(url, {method: "POST", body: data})
      .then(checkStatus)
      .then(JSON.parse)
      .then(prepare)
      .catch(console.error);
    id("pokedex-view").classList.add("hidden");
    id("start-btn").classList.add("hidden");
    manageMoveButtons(qsa("#p1 .moves button"), "add");
    qs("h1").innerText = "Pokemon Battle Mode!";
    qs("#p1 .hp-info").classList.remove("hidden");
    qs("#p1 .buffs").classList.remove("hidden");
    id("p2").classList.remove("hidden");
    id("results-container").classList.remove("hidden");
    id("flee-btn").classList.remove("hidden");
  }

  /**
   * manage pokemon's chosen attack by getting information from the server,
   * catch an error if there is one.
   */
  function attack() {
    let url = API_URL + GAME_URL;
    let data = new FormData();
    data.append("guid", guid);
    data.append("pid", pid);
    if (this.id === "flee-btn") {
      data.append("move", "flee");
    } else {
      let moveName = this.firstElementChild.innerText.replace(/\s+/g, '').toLowerCase();
      data.append("movename", moveName);
    }
    id("loading").classList.remove("hidden");
    fetch(url, {method: "POST", body: data})
      .then(checkStatus)
      .then(JSON.parse)
      .then(updateAttack)
      .catch(console.error);
  }

  /**
   * update pokemon game status with fightInfo and evaluate if the battle
   * has ended. If the game has ended, the results of the battle and the
   * button that directs back to the pokedex are shown, the pokemon's moves
   * stop functioning, and the flee button is hidden.
   * If the player won, the rival sprite would be displayed in color back
   * in the pokedex and could be chosen for future battles.
   * @param {object} fightInfo - the text version of the game status of the
                                  current battle
   */
  function updateAttack(fightInfo) {
    id("loading").classList.add("hidden");
    let p1Lost = updateStates("p1", fightInfo);
    let p2Lost = updateStates("p2", fightInfo);
    if (p1Lost || p2Lost) {
      let message = "";
      if (p1Lost) {
        message = "You lost!";
      } else {
        message = "You won!";
        let newPokemon = fightInfo["p2"]["shortname"];
        foundPokemon(id(newPokemon));
      }
      qs("h1").innerText = message;
      id("flee-btn").classList.add("hidden");
      id("endgame").classList.remove("hidden");
      manageMoveButtons(qsa("#p1 .moves button"), "disabled");
    }
  }

  /**
   * demonstrate the attack's turn results at the middle of the screen.
   * If a pokemon has dead, there won't be a result for it.
   * If the player's pokemon fled, the rival pokemon won't have a turn result.
   * Returns the boolean representing if the pokemon has lost.
   * @param {string} cardId - the id of the DOM object of the pokemon's card
   * @param {object} fightInfo - the text version of the game status of the
                                  pokemons of current battle
   * @return {boolean} - true if the pokemon is dead or
                        has lost the battle, false otherwise
   */
  function updateStates(cardId, fightInfo) {
    let results = fightInfo["results"];
    let turnResult = qs("#" + cardId + "-turn-results");
    let move =  results[cardId + "-move"];
    let result = results[cardId + "-result"];
    let playerNum = "1";
    if (cardId === "p2") {
      playerNum  = "2";
    }
    turnResult.innerText = "Player " + playerNum + " played " + move + " and " + result + "!";
    if (move != null) {
      turnResult.classList.remove("hidden");
    } else {
      turnResult.classList.add("hidden");
    }
    let currentPokemon = fightInfo[cardId];
    let currentHP = currentPokemon["current-hp"];
    let hpPercentage = currentHP / currentPokemon["hp"] * makePercentage;
    qs("#" + cardId + " .hp").innerText = currentHP + "HP";
    qs("#" + cardId + " .health-bar").style.width = hpPercentage + "%";
    if (hpPercentage < lowHealthPercentage) {
      qs("#" + cardId + " .health-bar").classList.add("low-health");
    }
    qs("#" + cardId + " .buffs").innerHTML = "";
    addBuffs(cardId, currentPokemon["buffs"], "buff");
    addBuffs(cardId, currentPokemon["debuffs"], "debuff");
    return ((currentHP === 0) || (result === "lost"));
  }

  /**
   * exit the battle mode view and re-display the pokedex and the most recently
   * selected pokemon's card on screen left. Re-display the button that starts
   * the game and hide the button that goes back to the pokedex.
   */
  function backToPokedex() {
    id("results-container").classList.add("hidden");
    id("p1-turn-results").classList.add("hidden");
    id("p2-turn-results").classList.add("hidden");
    id("p2").classList.add("hidden");
    qs("#p1 .hp-info").classList.add("hidden");
    qs("#p1 .buffs").classList.add("hidden");
    qs("h1").innerText = "Your Pokedex";
    qs("#p1 .hp").innerText = myPokemonHP + "HP";
    let hpBar = qsa(".health-bar");
    for (let i = 0; i < qsa(".buffs").length; i++) {
      qsa(".buffs")[i].innerHTML = "";
      hpBar[i].style.width = "100%";
      hpBar[i].classList.remove("low-health");
    }
    id("endgame").classList.add("hidden");
    id("pokedex-view").classList.remove("hidden");
    id("start-btn").classList.remove("hidden");
  }


  /* ------------------------------ Helper Functions  ------------------------------ */
  // Note: You may use these in your code, but do remember that your code should not have
  // any functions defined that are unused.

  /**
   * append current buffs to the pokemon's buffs panel.
   * @param {string} cardId - the id of the DOM object of the pokemon's card
   * @param {object[]} buffArray - array of the pokemon's current buffs or debuffs
   * @param {string} buffType - "buff" or "debuff" as the buffs' type
   */
  function addBuffs(cardId, buffArray, buffType) {
    for (let i = 0; i < buffArray.length; i++) {
      let buff = document.createElement("div");
      buff.classList.add(buffType);
      buff.classList.add(buffArray[i]);
      qs("#" + cardId + " .buffs").appendChild(buff);
    }
  }

  /**
   * edits the name and "DP"s of the pokemon's moves, leave DP blank if there isn't one
   * @param {object[]} moves - array of the DOM objects of pokemon's moves
   * @param {object[]} dps - array of the DOM objects of the pokemon's "DP"s
   * @param {object[]} moveTypes - array of the DOM objects of the pokemon's moves' types
   * @param {object[]} pokemonMoves - array of the pokemon's moves information
   */
  function showMoves(moves, dps, moveTypes, pokemonMoves) {
    for (let i = 0; i < pokemonMoves.length; i++) {
      moves[i].innerText = pokemonMoves[i]["name"];
      moveTypes[i].src = API_URL + ICON + pokemonMoves[i]["type"] +".jpg";
      let dp = pokemonMoves[i]["dp"];
      if (dp) {
        dps[i].innerText = dp + " DP";
      } else {
        dps[i].innerText = "";
      }
    }
  }

  /**
   * manages the pokemon's moves button by enabling or disabling the moves buttons.
   * @param {object[]} moves - array of the DOM objects of pokemon's moves
   * @param {string} action - "add" or "disabled" representing to enable or disable the button
   */
  function manageMoveButtons(moves, action) {
    for (let i = 0; i < moves.length; i++) {
      let move = moves[i];
      if (action === "add") {
        move.disabled = false;
        move.addEventListener("click", attack);
      } else {
        move.disabled = true;
      }
    }
  }

  /**
   * removes the class with the given classname from every element of the given array
   * @param {object[]} array - array of DOM objects to remove the class from
   * @param {string} className - the name of the class to be removed
   */
  function removeClass(array, className) {
    for (let i = 0; i < array.length; i++) {
      array[i].classList.remove(className);
    }
  }

  /**
   * helper functions that display color for the found pokemon and allow it to be chosen
   * @param {object} pokemon - the DOM object of the found pokemon
   */
  function foundPokemon(pokemon) {
    pokemon.classList.add("found");
    pokemon.addEventListener("click", getCardInfo);
  }

  /**
   * Returns the element that has the ID attribute with the specified value.
   * @param {string} idName - element ID
   * @returns {object} DOM object associated with id.
   */
  function id(idName) {
    return document.getElementById(idName);
  }

  /**
   * Returns the first element that matches the given CSS selector.
   * @param {string} query - CSS query selector.
   * @returns {object} The first DOM object matching the query.
   */
  function qs(query) {
    return document.querySelector(query);
  }

  /**
   * Returns the array of elements that match the given CSS selector.
   * @param {string} query - CSS query selector
   * @returns {object[]} array of DOM objects matching the query.
   */
  function qsa(query) {
    return document.querySelectorAll(query);
  }

  /**
   * Helper function to return the response's result text if successful, otherwise
   * returns the rejected Promise result with an error status and corresponding text
   * @param {object} response - response to check for success/error
   * @returns {object} - valid result text if response was successful, otherwise rejected
   *                     Promise result
   */
  function checkStatus(response) {
    if (response.status >= 200 && response.status < 300 || response.status == 0) {
      return response.text();
    } else {
      return Promise.reject(new Error(response.status + ": " + response.statusText));
    }
  }
})();
