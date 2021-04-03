#include <solana_sdk.h>

typedef struct {
	uint8_t slots[32]; /** initialized 0*/
	uint8_t timestamp[8]; /** unix timestamp 32*/
} ClockInfo;

typedef struct {
    uint8_t gameStatus; //0 0 initial 1//new game //2 in progress;
	SolPubkey player1; //1 player1 public key;
	SolPubkey player2; //33 player2 public key;
	uint8_t player1Commited; //65 player1 commited
	uint8_t player1Revealed; //66 player1 revealed
	uint32_t player1Commit ; //67 player1 commitment
	uint8_t player2Commited; //71 player2 commited
	uint8_t player2Revealed; //72 player2 revealed
	uint32_t player2Commit; //73 player2 commitment	
	uint8_t player1Character; //77 player1Character
	uint8_t player1HonestReveal; //78 player1 honestReveal?	
	uint8_t player1Reveal[10]; //79 player1 reveal
	uint8_t player2Character; //89 player2Character
	uint8_t player2HonestReveal ; //90 player2 honestReveal?	
	uint8_t player2Reveal[10]; //91 player2 reveal 
	uint8_t skip3; //101 blank
	uint64_t moveStamp; //102 player2 commitment	
    uint8_t player1Health; //110 - default 100
    uint8_t player1SuperBar; //111 - player1 super bar 0
    uint8_t player2Health; //112 - default 100
    uint8_t player2SuperBar; //113 - default 0  
    uint8_t player1Move; //114   
    uint8_t player2Move; //115 
    uint8_t matchOutcome; //116 - 0:timeout/undecided 1:player1 2:player2 3:draw     
    uint64_t startTime; //117 unix timestamp in seconds;
} GameState;

uint64_t LEbytesto64(uint8_t *arr) {
	uint64_t number64 = (uint64_t)(
		(unsigned long)(arr[0]) << 0 |
		(unsigned long)(arr[1]) << 8 |
		(unsigned long)(arr[2]) << 16 |
		(unsigned long)(arr[3]) << 24 |
		(unsigned long)(arr[4]) << 32 |
		(unsigned long)(arr[5]) << 40 |
		(unsigned long)(arr[6]) << 48 |
		(unsigned long)(arr[7]) << 56
		);
	return number64;
}

bool verify(SolParameters *params,int player){
	SolAccountInfo *Account = &params->ka[0];
	uint32_t hash = 0;
	
	int offset = 0;
	bool honest = false;
	if(player == 1){offset = 67;}
	else if(player == 2){offset = 73;}
	uint32_t commit = (uint32_t)(
			(unsigned char)(Account->data[ offset + 0]) << 24 |
            (unsigned char)(Account->data[ offset + 1]) << 16 |
            (unsigned char)(Account->data[ offset + 2]) << 8 |
            (unsigned char)(Account->data[ offset + 3])
     );
	for(int c =0;c < 10;c++){
		hash = params->data[c+1] + (hash << 6) + (hash << 16) - hash;
	}
	honest = (hash == commit) ? true : false;
	if(honest){sol_log("honest reveal");}
	else{sol_log("dishonest reveal");}
	return honest;
}

uint64_t getMoveStamp(SolParameters *params,int option){
	//Need to check if it is writable and the write size and owned by the program
	SolAccountInfo *Account = &params->ka[0];
	GameState *gameState = (GameState *)Account->data;
	if(option == 1){
		sol_log("return start time");
		return gameState->startTime;
	}
	int offset = option == 0 ? 102 : 117;
	uint64_t time = LEbytesto64(&Account->data[ offset ]);
    return time;
}

//Make sure user is an active player
bool isPlayer(SolParameters *params,int player){
	bool result = true;
	SolAccountInfo *Account = &params->ka[0];
	SolAccountInfo *XAccount = &params->ka[1];
	GameState *gameState = (GameState *)Account->data;	
	//Make sure player x signed this message
	if (!XAccount->is_signer) {
		sol_log("Signing Error");
		result = false;
	}	
	if( player == 2 && !SolPubkey_same(XAccount->key,&gameState->player2) ){
		result = false;
	}
	else if( player == 1 && !SolPubkey_same(XAccount->key,&gameState->player1) ){
		result = false;
	}
	return result;
}

bool validAccount(SolParameters *params){
	SolAccountInfo *Account = &params->ka[0];
	bool valid = false;
	if (SolPubkey_same(Account->owner, params->program_id)) {
		valid = true;
	}
	else{
		sol_log("Account access violation");
	}
	return valid;	
}

bool validClock(SolParameters *params){
	bool isGoodClock = true;
	SolAccountInfo *Clock = &params->ka[2];
	SolPubkey publicClock[32] = {0x6,0xa7,0xd5,0x17,0x18,0xc7,0x74,0xc9,0x28,0x56,0x63,0x98,0x69,0x1d,0x5e,0xb6,0x8b,0x5e,0xb8,0xa3,0x9b,0x4b,0x6d, 0x5c,0x73, 0x55,0x5b,0x21,0x0, 0x0,0x0, 0x0};
	if (!SolPubkey_same(publicClock, Clock->key)) {
		isGoodClock = false;
	}
	return isGoodClock;
}

uint64_t getTime(SolParameters *params) {
	SolAccountInfo *Clock = &params->ka[2];
	ClockInfo *clockInfo = (ClockInfo *)Clock->data;
	uint64_t now = LEbytesto64(clockInfo->timestamp);
	return now;
}

uint64_t countDown(SolParameters *params,int option){
	uint64_t diff64 = getTime(params) - getMoveStamp(params,option);
	return diff64;
}

void gameLogic(SolParameters *params,uint8_t p1Move,uint8_t p2Move){
	SolAccountInfo *Account = &params->ka[0];
	uint8_t p1 = 110;
	uint8_t p2 = 112;
	//2 Invalid moves
	if(p1Move == 4 && p1Move == p2Move){
		Account->data[p1] = 0;
		Account->data[p2] = 0;
	}
	//1 Invalid move
	else if(p1Move == 4 && p2Move <= 2){
		Account->data[p1] = 0;
	}
	else if(p2Move == 4 && p1Move <= 2){
		Account->data[p2] = 0;
	}
	//Double K.O.
	else if(p1Move == p2Move){
		Account->data[p1] = 0;
		Account->data[p2] = 0;
	} 
	//Other
	else if(p1Move == 0 && p2Move == 1 ){
		Account->data[p1] = 0;
	}	
	else if(p1Move == 0 && p2Move == 2 ){
		Account->data[p2] = 0;		
	}	
	else if(p1Move == 1 && p2Move == 0 ){
		Account->data[p2] = 0;
	}	
	else if(p1Move == 1 && p2Move == 2 ){
		Account->data[p1] = 0;
	}	
	else if(p1Move == 2 && p2Move == 0 ){
		Account->data[p1] = 0;
	}	
	else if(p1Move == 2 && p2Move == 1 ){
		Account->data[p2] = 0;
	}	
	return;
}

uint64_t step(SolParameters *params){
	if (params->ka_num < 2) {
		sol_log("2 Accounts needed to step");
		return ERROR_NOT_ENOUGH_ACCOUNT_KEYS;
	}	
	SolAccountInfo *Account = &params->ka[0];
	SolAccountInfo *XAccount = &params->ka[1];
	if(!isPlayer(params,1) && !isPlayer(params,2)){
		sol_log("This is not the game you are looking for");
		return ERROR_INVALID_ACCOUNT_DATA;
	}
	//Honest Reveals get to choose their move || 0-Rock 1-Paper 2-Scissors 4-Lose
	uint8_t p1Move = Account->data[ 78 +6 ];
	uint8_t p2Move = Account->data[ 90 + 6 ];

	if(p1Move == 48){p1Move = 0;}
	if(p1Move == 49){p1Move = 1;}
	if(p1Move == 50){p1Move = 2;}
	if(p1Move == 51){p1Move = 3;}
	if(p2Move == 48){p2Move = 0;}
	if(p2Move == 49){p2Move = 1;}
	if(p2Move == 50){p2Move = 2;}
	if(p2Move == 51){p2Move = 3;}	

	sol_log_64(0,0,0,p1Move,p2Move);
	gameLogic(params,p1Move,p2Move);
	sol_log("Step Complete");
	uint8_t p1Health = Account->data[110];
	uint8_t p2Health = Account->data[112];
	Account->data[114] = p1Move; 
	Account->data[115] = p2Move;	
	//Check if the game is over
	//Wrap up the game, no exta innings
	if(p1Health == 0 || p2Health == 0){
		if(p1Health > p2Health){
			sol_log("Player 1 wins");
			Account->data[116] = 1;
		}
		else if(p2Health > p1Health){
			sol_log("Player 2 wins");
			Account->data[116] = 2;	
		}
		else{
			sol_log("Draw");
			Account->data[116] = 3;	
		}
	}	
	//clear commits,reveals,and part of the timer
	for(int i = 65;i < 103;i++){Account->data[i] = 0;} 				
	return SUCCESS;
}

//Accept A Game
//NEED to check this is the signed of the transaction
uint64_t acceptChallenge(SolParameters *params){
	//Accounts arguments needed
	if (params->ka_num < 2) {
		sol_log("2 Accounts needed to accept a challenge");
		return ERROR_NOT_ENOUGH_ACCOUNT_KEYS;
	}
	SolAccountInfo *Account = &params->ka[0];
	SolAccountInfo *XAccount = &params->ka[1];
	GameState *gameState = (GameState *)Account->data;
	//Check that the challenger has signed the transaction
	if (!XAccount->is_signer) {
		sol_log("Signing Error");
		return ERROR_INVALID_ACCOUNT_DATA;
	}
	//Anyone can accept the the challege
	if(gameState->gameStatus == 1){
		gameState->player2 = *XAccount->key;
		gameState->gameStatus = 2;
		//Set character
		Account->data[89] = params->data[1];
		sol_log("Challenge Accepted");
		return SUCCESS;
	}
	else{
		sol_log("BAD GAME STATE");
	}
	return ERROR_INVALID_ARGUMENT;
}

//COMMIT
uint64_t commit(SolParameters *params){
	//Account arguments needed
	if (params->ka_num < 2) {
		sol_log("2 Accounts needed to commit");
		return ERROR_NOT_ENOUGH_ACCOUNT_KEYS;
	}	
	SolAccountInfo *Account = &params->ka[0];
	SolAccountInfo *Committer = &params->ka[1];
	//Commit is uint32 bytes
	if (params->data_len != 5) {
		sol_log("Commit incorrect size");
		return ERROR_INVALID_ARGUMENT;
	}
	//You can only commit after the game was accepted
	if(Account->data[0] == 2){
		//You can only commit if the current slot to commit = 0 && reveal has not be performed
		if(isPlayer(params,1) && Account->data[65] == 0 && Account->data[66] == 0){
			Account->data[65] = 1;
			for(int i =0;i < 4;i++){
				Account->data[ 67+i ] = params->data[1+i];
			}			
			sol_log("Player 1 Commit");
			return SUCCESS;
		}
		else if(isPlayer(params,2) && Account->data[71] == 0 && Account->data[72] == 0){
			Account->data[71] = 1;
			for(int i =0;i < 4;i++){
				Account->data[ 73+i ] = params->data[1+i];
			}
			sol_log("Player 2 Commit");
			return SUCCESS;
		}
		else{
			sol_log("Afraid of Commitment?");
		}
	}
	else{
		sol_log("BAD GAME STATE");
	}
	return ERROR_INVALID_ARGUMENT;
}

//Reveal 
uint64_t reveal(SolParameters *params){
	//Account arguments needed
	if (params->ka_num < 3) {
		sol_log("3 Accounts needed to reveal");
		return ERROR_NOT_ENOUGH_ACCOUNT_KEYS;
	}		
	SolAccountInfo *Account = &params->ka[0];
	SolAccountInfo *Revealer = &params->ka[1];
	SolAccountInfo *Clock = &params->ka[2];
	if(!validClock(params)){	return ERROR_INVALID_ARGUMENT;}
	//Reveal is string 10 characters long
	if (params->data_len != 11) {
		sol_log("Reveal incorrect length");
		return ERROR_INVALID_ARGUMENT;
	}
	//You can only reveal after this game was accepted and both players have committed
	if(Account->data[0] == 2){
		//You can only reveal if you already committed;
		uint8_t honest = 4;
		if(isPlayer(params,1) && Account->data[65] == 1 && Account->data[66] == 0){
			sol_log("Player 1 Revealing:");
			Account->data[66] = 1;
			honest = verify(params,1) ? 8 : 4; 
			Account->data[ 78 ] = honest;
			for(int i =0;i < 10;i++){
				Account->data[ 79+i ] = params->data[1+i];
			}			
		}	
		else if(isPlayer(params,2) && Account->data[71] == 1 && Account->data[72] == 0){
			sol_log("Player 2 Revealing:");
			Account->data[72] = 1;
			honest = verify(params,2) ? 8 : 4; 
			Account->data[ 90 ] = honest;
			for(int i =0;i < 10;i++){
				Account->data[ 91+i ] = params->data[1+i];
			}
		}
		//Set timer if it is not already set
		if(honest == 8 && Account->data[ 102 ] == 0){
			sol_log("Setting Timer");
			for(int i = 0;i < 8;i++){Account->data[ 102 + i] = Clock->data[i+32];}	
		}
		else if (honest == 8 && Account->data[ 102 ] > 0){
			//check reaveal expiration
			uint64_t expired = countDown(params,0);
			if(expired > 30){
				sol_log("Time Expired");
				//Action is set to idle
				if(isPlayer(params,2)){Account->data[ 90 + 6] = 4;}
				else if(isPlayer(params,1)){Account->data[ 78 + 6 ] = 4;}
			}
		}
		//Step
		if(Account->data[ 90 ] > 0 && Account->data[ 78 ] > 0){
			return step(params);
		} 
	}
	else{
		sol_log("BAD GAME STATE");
	}
	return SUCCESS;
}

//SETUP A NEW GAME
//Expects Accounts [program account,user,clock}]
//Need to make sure the signer is really the challenger
uint64_t setupGame(SolParameters *params){
	if (params->ka_num < 3) {
		sol_log("3 Accounts Needed for Game Setup");
		return ERROR_NOT_ENOUGH_ACCOUNT_KEYS;
	}
	if(!validAccount(params)){ return ERROR_INCORRECT_PROGRAM_ID; }	
	//Start a game only if it has not been started
	SolAccountInfo *Account = &params->ka[0];
	SolAccountInfo *Challenger = &params->ka[1];
	SolAccountInfo *Clock = &params->ka[2];
	SolAccountInfo *Allowed = &params->ka[3];
	GameState *gameState = (GameState *)Account->data;	
	//Make sure the challenger has signed the message
	if (!Challenger->is_signer) {
		sol_log("Signing Error");
		return ERROR_INVALID_ACCOUNT_DATA;
	}
	if(!validClock(params)){	return ERROR_INVALID_ARGUMENT;}
	uint64_t expired = countDown(params,1);
	sol_log("Game setup");
	//Let any user start a new game if 
	//0)This is the first game creation
	//1)Previous game has been completed
	//2)Previous game time limit reach
	bool canSetup = false;
	if( (gameState->gameStatus == 0) || (gameState->matchOutcome > 0) || (expired > 180) ){
		canSetup = true;
	}
	else{
		sol_log("Invalid Game State");
		return ERROR_INVALID_ARGUMENT;
	}
	if(canSetup){
		//clear out old data
		for(int i = 0;i < 157;i++){
			Account->data[i] = 0;
		}
		//set game state to in progress || 1
		gameState->gameStatus = 1;
		//Set Challenger Address		
		gameState->player1 = *Challenger->key;
		//set health of players to 100
		Account->data[110] = 100;
		Account->data[112] = 100;
		//Set Game StartTime
		for(int i = 0;i < 8;i++){Account->data[ 117 + i] = Clock->data[i+32];}	
		//Set character
		Account->data[77] = params->data[1];
		//Set allowed participants
		if(params->data[2] == 1){
			gameState->player2 = *Allowed->key;
			gameState->gameStatus = 2;
		}
		sol_log("Game SETUP complete");
	}
	return SUCCESS;
}
extern uint64_t entrypoint(const uint8_t *input) {
	SolAccountInfo accounts[4];
	SolParameters params = (SolParameters){.ka = accounts};
	if (!sol_deserialize(input, &params, SOL_ARRAY_SIZE(accounts))) {
		return ERROR_INVALID_ARGUMENT;
	}; 
  
	//0 setup a game
	if(params.data[0] == 0){
		return setupGame(&params);
	}
	//1 acceptChallenge
	else if(params.data[0] == 1){
		return acceptChallenge(&params);
	}	
	//2 commit
	else if(params.data[0] == 2){
		commit(&params);
	}	
	//3 reveal
	else if(params.data[0] == 3){
		reveal(&params);
	}							
	return SUCCESS;  
}
