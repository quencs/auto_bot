export class Pokemon {
  constructor({name:string, value:number}) {
    this.name = name;
    this.value = value;
  }
}

export class Player {
  constructor(props = { discordAccount: string, numberOfPokemon: number, budget: number}) {
    this.discordAccount = props.discordAccount;
    this.budget = props.budget;
    this.numberOfPokemon = props.numberOfPokemon;
    this.draftedPokemon = new Set();
  }

  static addPokemon(pokemon) {
    if(isValidPokemon(pokemon))
    { 
      this.draftedPokemon.add(pokemon);
      return true;
    }
    return false;
  }

  static isValidPokemon(pokemon) {
    //no repeats
    if(this.draftedPokemon.has(pokemon)){
      return false;
    }
    //no overbudget
    if(getCurrentValue() + pokemon["value"] > this.budget) {
      return false;
    }
    //no going over the legal amount of pokemon (should never be hit, but just in case)
    if(this.draftedPokemon.size() >= this.numberOfPokemon) {
      return false;
    }
    return true;
  }

  static getCurrentValue() {
    let sum = 0;
    for (const item of mySet) {
      sum += item.value;
    }
    return sum;
  }
}

export class DraftOrganizer {
  constructor(props = {budget: number, numberOfPokemon: number, players: [], period: number}) {
    this.budget = props.budget;
    this.numberOfPokemon = props.numberOfPokemon;
    this.period = props.period;
    this.players = constructPlayers(props.players);
    
    this.runDraft();
  }

  static constructPlayers(players){
    let playerList = [];

    for(player in players) {
      playerList.push(new Player(player, this.numberOfPokemon, this.budget));
    }
    return playerList;
  }

  static runDraft() {
    let draftStage = 0;

    const queue = [...this.players];
    const stack = [];
    const deliquents = [];

    while(draftStage < this.numberOfPokemon) {
      while(queue.length() < 0){
        this.notify(queue[0]);
        const isSuccessful = this.awaitPlayer(queue[0]); //idk how this works
        if(isSuccessful){
          queue.push(queue[0]);
        } else {
          deliquents.push(queue[0])
        }
        queue.shift();
      }
      draftStage++;
      while(queue.length() > 0){

      }
    } 

    while(deliquents.length() > 0) {
      this.notify(deliquents[0]);
      const isSuccessful = this.awaitPlayer(deliquents[0]); //idk how this works
      if(!isSuccessful) {
        deliquents.push(deliquents[0]);
      } 
      deliquents.shift();
    }
  }

  static awaitPlayer(){
    //use discord hook to get input from player
    //const pokemon 
  }

  
  static notify(){

    //use discord hook to message player its their turn
    //continue;

  }


}