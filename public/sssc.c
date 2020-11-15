#include <solana_sdk.h>
#include <deserialize_deprecated.h>

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
	int offset = option == 0 ? 102 : 117;
	uint64_t time = (uint64_t)(
			(unsigned long)(Account->data[ offset + 0]) << 56 |
            (unsigned long)(Account->data[ offset + 1]) << 48 |
            (unsigned long)(Account->data[ offset + 2]) << 40 |
            (unsigned long)(Account->data[ offset + 3]) << 32 |
			(unsigned long)(Account->data[ offset + 4]) << 24 |
            (unsigned long)(Account->data[ offset + 5]) << 16 |
            (unsigned long)(Account->data[ offset + 6]) << 8 |
            (unsigned long)(Account->data[ offset + 7])
     );	
     return time;
}

//Make sure user is an active player
bool isPlayer(SolParameters *params,int player){
	bool result = true;
	SolAccountInfo *Account = &params->ka[0];
	SolAccountInfo *XAccount = &params->ka[1];
	//Make sure player x signed this message
	if (!XAccount->is_signer) {
		sol_log("Signing Error");
		result = false;
	}	
	if(player == 2){
		for(int i = 0;i < 32;i++){
			if(XAccount->key->x[i] != Account->data[33+i]){
				result = false;
				break; 
			}
		}
	}
	else if(player == 1){
		for(int i = 0;i < 32;i++){
			if(XAccount->key->x[i] != Account->data[1+i]){
				result = false;
				break; 
			}
		}
	}
	//Check that we are authorized to modify the account
	if (!SolPubkey_same(Account->owner, params->program_id)) {
		sol_log("Account access violation");
		result = false;
	}
	return result;
}

bool checkClock(SolParameters *params){
	bool isGoodClock = true;
	SolAccountInfo *Clock = &params->ka[2];
	uint8_t publicClock[32] = {0x6,0xa7,0xd5,0x17,0x18,0xc7,0x74,0xc9,0x28,0x56,0x63,0x98,0x69,0x1d,0x5e,0xb6,0x8b,0x5e,0xb8,0xa3,0x9b,0x4b,0x6d, 0x5c,0x73, 0x55,0x5b,0x21,0x0, 0x0,0x0, 0x0};
	for(int i = 0;i < 32;i++){
		if(publicClock[i] != Clock->key->x[i]){
			isGoodClock = false;
			break;
		}
	}
	return isGoodClock;
}

uint64_t getTime(SolParameters *params){
	SolAccountInfo *Account = &params->ka[0];
	SolAccountInfo *Clock = &params->ka[2];
	bool goodClock = checkClock(params);
	if(!goodClock){
		if(isPlayer(params,2)){Account->data[ 90+6 ] = 4;}
		else if(isPlayer(params,1)){Account->data[ 78+6 ] = 4;}
		sol_log("Bad Clock while getting Time");
		return 0;
	}
	int offset = 32;
	uint64_t time = (uint64_t)(
			(unsigned long)(Clock->data[ offset + 0]) << 56 |
            (unsigned long)(Clock->data[ offset + 1]) << 48 |
            (unsigned long)(Clock->data[ offset + 2]) << 40 |
            (unsigned long)(Clock->data[ offset + 3]) << 32 |
			(unsigned long)(Clock->data[ offset + 4]) << 24 |
            (unsigned long)(Clock->data[ offset + 5]) << 16 |
            (unsigned long)(Clock->data[ offset + 6]) << 8 |
            (unsigned long)(Clock->data[ offset + 7])
     );	
     return time;
}

int countDown(SolParameters *params,int option){
	uint64_t diff64 = getTime(params) - getMoveStamp(params,option);
	int diff = ((unsigned char *)(&diff64))[7];
	sol_log_64(0,0,0,diff,diff64);
	return diff;
}

uint64_t step(SolParameters *params){
	if (params->ka_num < 2) {
		sol_log("2 Accounts needed to step");
		return ERROR_NOT_ENOUGH_ACCOUNT_KEYS;
	}	
	//should be able to call this in case 1 user tries to freeze the other user out
	//Just make sure it is the write contract and the signer is a player
	//Nees to check that reveals have happened and or there has been a timeout
	SolAccountInfo *Account = &params->ka[0];
	SolAccountInfo *XAccount = &params->ka[1];
	if(!isPlayer(params,1) && !isPlayer(params,2)){
		sol_log("This is not the game you are looking for");
		return ERROR_INVALID_ACCOUNT_DATA;
	}
	uint8_t p1Health = Account->data[110];
	uint8_t p1Super = Account->data[111];
	uint8_t p2Health = Account->data[112];
	uint8_t p2Super = Account->data[113];	

	//Honest Reveals get to choose their move || 0-Punch 1-Gaurd 2-Counter 3-Taunt 4-Idle
	uint8_t p1Move = Account->data[ 78 +6 ];
	uint8_t p2Move = Account->data[ 90 + 6 ];

	sol_log_64(0,0,0,p1Move,p2Move);
	if(p1Move == 48){p1Move = 0;}
	if(p1Move == 49){p1Move = 1;}
	if(p1Move == 50){p1Move = 2;}
	if(p1Move == 51){p1Move = 3;}
	if(p2Move == 48){p2Move = 0;}
	if(p2Move == 49){p2Move = 1;}
	if(p2Move == 50){p2Move = 2;}
	if(p2Move == 51){p2Move = 3;}	

	sol_log_64(0,0,0,p1Move,p2Move);
	uint8_t p1attack = 100;
	uint8_t p2attack = 100;
	if(p1Super > 99){p1attack *= 2;p1Super = 200;}
	if(p2Super > 99){p2attack *= 2;p2Super = 200;}	
	if(p1Move > 4){p1Move = 4;}
	if(p2Move > 4){p2Move = 4;}
	if(p1Move == 0){
		p1Super += p1attack;
		if(p2Move == 0){
			p1Health -= p2attack;
			p2Health -= p1attack;
			p2Super += p2attack*2;
		}
		else if(p2Move == 1){
			p2Health -= p1attack/2;
		}
		else if(p2Move == 2){
			p1Health -= (p2attack*2);
		}
		else if(p2Move == 3){
			p2Health -= (p1attack + (p1attack/2));
		}
		else if(p2Move == 4){
			p2Health -= p1attack;
		}								
	}
	else if(p1Move == 1){
		if(p2Move == 0){
			p1Health -= p2attack/2;
			p2Super += p2attack*2;
		}
		else if(p2Move == 1){
		}
		else if(p2Move == 2){
			p2Health -= p1attack;
		}
		else if(p2Move == 3){
			p2Super += (p2attack + (p2attack/2))*2;
			p1Health -= p2attack;
		}
		else if(p2Move == 4){
		}								
	}	
	else if(p1Move == 2){
		if(p2Move == 0){
			p2Health -= (p1attack*2);
		}
		else if(p2Move == 1){
			p1Health -= p2attack;
		}
		else if(p2Move == 2){
		}
		else if(p2Move == 3){
			p2Super += p2attack*2;
		}
		else if(p2Move == 4){
		}								
	}
	else if(p1Move == 3){
		if(p2Move == 0){
			p1Health -= (p2attack + (p2attack/2));
			p2Super += p2attack*2;
		}
		else if(p2Move == 1){
			p1Super += (p1attack + (p1attack/2))*2;
			p2Health -= p1attack;
		}
		else if(p2Move == 2){
			p1Super += p1attack;
		}
		else if(p2Move == 3){
			p1Super += p1attack;
			p2Super += p2attack*2;
		}
		else if(p2Move == 4){
			p1Super += (p1attack*2);
		}								
	}	
	else if(p1Move == 4){
		if(p2Move == 0){
			p1Health -= p2attack;
			p2Super += p2attack*2;
		}
		else if(p2Move == 1){
		}
		else if(p2Move == 2){
		}
		else if(p2Move == 3){
			p2Super += (p2attack*2);
		}
		else if(p2Move == 4){
		}								
	}
	sol_log("Step Complete");
	sol_log_64(p1Move,p2Move,p1Health,p2Health,p1Super);
	if(p1Super >= 200){p1Super = 0;}
	if(p2Super >= 200){p2Super = 0;}
	//kill the zombies	
	if(p1Health > 100){p1Health = 0;}
	if(p2Health > 100){p2Health = 0;}
	Account->data[110] = p1Health;
	Account->data[111] = p1Super; 
	Account->data[112] = p2Health; 
	Account->data[113] = p2Super;
	Account->data[114] = p1Move; 
	Account->data[115] = p2Move;
	//Check if the game is over
	//Wrap up the game, no exta innings
	if(p1Health <= 0 || p2Health <= 0){
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
	//Check that the challenger has signed the transaction
	if (!XAccount->is_signer) {
		sol_log("Signing Error");
		return ERROR_INVALID_ACCOUNT_DATA;
	}
	//Anyone can accept the the challege
	if(Account->data[0] == 1){
		sol_memcpy(&Account->data[33],XAccount->key->x,32);
		Account->data[0] = 2;
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
	//Reveal is string 10 characters long
	if (params->data_len != 11) {
		sol_log("Reveal incorrect length");
		return ERROR_INVALID_ARGUMENT;
	}
	//You can only reveal after this game was accepted and both players have committed
	if(Account->data[0] == 2){
		//You can only reveal if you already committed;
		int honest = 4;
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
		bool goodClock = checkClock(params);
		if(honest == 8 && Account->data[ 102 ] == 0){
			//check publickey of clock
			if(!goodClock){
				if(isPlayer(params,2)){Account->data[ 90+6 ] = 4;}
				else if(isPlayer(params,1)){Account->data[ 78+6 ] = 4;}
				sol_log("Bad Clock");
			}
			else{
				sol_log("Setting Timer");
				for(int i = 0;i < 8;i++){
					Account->data[ 102 + i] = Clock->data[i+32];
				}	
			}		
		}
		else if (honest == 8 && Account->data[ 102 ] > 0){
			//check reaveal expiration
			uint64_t currentTime = getTime(params);
			int expired = countDown(params,0);
			sol_log_64(0,0,0,currentTime,expired);
			if(currentTime > 0){
				if(expired > 10){
					sol_log("Time Expired");
					//Action is set to idle
					if(isPlayer(params,2)){Account->data[ 90 + 6] = 4;}
					else if(isPlayer(params,1)){Account->data[ 78 + 6 ] = 4;}
				}
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
	return ERROR_INVALID_ARGUMENT;
}

//SETUP A NEW GAME
//Expects Accounts [program account,user,clock}]
//Need to make sure the signer is really the challenger
uint64_t setupGame(SolParameters *params){
	if (params->ka_num < 3) {
		sol_log("3 Accounts Needed for Game Setup");
		return ERROR_NOT_ENOUGH_ACCOUNT_KEYS;
	}
	//Start a game only if it has not been started
	SolAccountInfo *Account = &params->ka[0];
	SolAccountInfo *Challenger = &params->ka[1];
	SolAccountInfo *Clock = &params->ka[2];
	//Make sure we have the right account
	if (!SolPubkey_same(Account->owner, params->program_id)) {
		sol_log("Account access violation");
		return ERROR_INCORRECT_PROGRAM_ID;
	}
	//Make sure the challenger has signed the message
	if (!Challenger->is_signer) {
		sol_log("Signing Error");
		return ERROR_INVALID_ACCOUNT_DATA;
	}
	bool goodClock = checkClock(params);
	if(!goodClock){
		sol_log("Bad Clock");
		return ERROR_INVALID_ARGUMENT;
	}
	int expired = countDown(params,1);
	sol_log("Game setup");
	//Let any user start a new game if 
	//0)This is the first game creation
	//1)Previous game has been completed
	//2)Previous game time limit reach
	if( (Account->data[0] == 0) || (Account->data[116] > 0) || (expired > 180) ){
		//clear out old data
		for(int i = 0;i < 125;i++){
			Account->data[i] = 0;
		}
		//set game state to in progress || 1
		Account->data[0] = 1;
		//set health of players to 100
		Account->data[110] = 100;
		Account->data[112] = 100;
		//Set Challenger Address
		sol_memcpy(&Account->data[1],Challenger->key->x,32);
		//Set Game StartTime
		for(int i = 0;i < 8;i++){
			Account->data[ 117 + i] = Clock->data[i+32];
		}	
		sol_log("Game SETUP complete");
	}
	else{
		sol_log("Bad Game State");
		return ERROR_INVALID_ARGUMENT;
	}
	return SUCCESS;
}
////

extern uint64_t entrypoint(const uint8_t *input) {
	SolAccountInfo accounts[3];
	SolParameters params = (SolParameters){.ka = accounts};

	if (!sol_deserialize_deprecated(input, &params, SOL_ARRAY_SIZE(accounts))) {
		return ERROR_INVALID_ARGUMENT;
	}
  
	//0 setup a game
	if(params.data[0] == 0){
		setupGame(&params);
	}
	//1 acceptChallenge
	else if(params.data[0] == 1){
		acceptChallenge(&params);
	}	
	//2 commit
	else if(params.data[0] == 2){
		commit(&params);
	}	
	//3 reveal
	else if(params.data[0] == 3){
		reveal(&params);
	}
	//4 step
	else if(params.data[0] == 4){
		//return t(&params);
	}	
	//5 withdraw Owner
	else if(params.data[0] == 5){
		//return withdraw(&params);
	}	
	//6 countdown
	else if(params.data[0] == 6){
		return countDown(&params,1);
	}					
	return SUCCESS;  
}


uint64_t endGame(SolParameters *params){
	//TODO Allow Betting and transfering lamports
	//Make sure a game can be expired if it lasts longer than 5 minutes
	SolAccountInfo *Account = &params->ka[0];
	if(isPlayer(params,1) || isPlayer(params,2)){
		if(Account->data[116] == 1){
			sol_log("withdraw");
		}
		else if(Account->data[116] == 2){
			sol_log("withdraw");
		}
		else{
			sol_log("withdraw");
		}
		for(int i = 0;i < 125;i++){
			Account->data[i] = 0;
		}
		return SUCCESS;
	}
	return ERROR_INVALID_ARGUMENT; 
}

//The game should have a timelimit 
//whoever is winning after time over is the winner

