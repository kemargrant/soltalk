#include <solana_sdk.h>
#include <deserialize_deprecated.h>

uint64_t overwrite(SolParameters *params,char *x) {
  if (params->ka_num < 1) {
    sol_log("Missing valid account");
    return ERROR_NOT_ENOUGH_ACCOUNT_KEYS;
  }

  SolAccountInfo *author_account = &params->ka[0];

  if (!SolPubkey_same(author_account->owner, params->program_id)) {
	sol_log("Incorrect program id");
	return ERROR_INCORRECT_PROGRAM_ID;
  }

  if (author_account->data_len != 1028) {
    sol_log("Account data incorrect size");
    return ERROR_INVALID_ACCOUNT_DATA;
  }

  for(int i = 1027; i > -1;i--){author_account->data[i] = x[i];}
  return SUCCESS;
}

extern uint64_t entrypoint(const uint8_t *input) {
  SolAccountInfo accounts[1];
  SolParameters params = (SolParameters){.ka = accounts};

  if (!sol_deserialize_deprecated(input, &params, SOL_ARRAY_SIZE(accounts))) {
    return ERROR_INVALID_ARGUMENT;
  }
  
  //Enforce message size
  if(params.data_len != 1028){
	  sol_log("Input data incorrect size");
	  return ERROR_INVALID_ARGUMENT;
  }
  
  char *input_text = (char *)params.data;
  return overwrite(&params,input_text);
}

