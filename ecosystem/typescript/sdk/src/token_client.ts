import isEqual from "lodash/isEqual";

import { AptosAccount } from "./aptos_account";
import { AptosClient } from "./aptos_client";
import * as TokenTypes from "./token_types";
import * as Gen from "./generated/index";
import { HexString, MaybeHexString } from "./hex_string";

const NUMBER_MAX: number = 9007199254740991;
/**
 * Class for creating, minting and managing minting NFT collections and tokens
 */
export class TokenClient {
  aptosClient: AptosClient;

  /**
   * Creates new TokenClient instance
   * @param aptosClient AptosClient instance
   */
  constructor(aptosClient: AptosClient) {
    this.aptosClient = aptosClient;
  }

  /**
   * Brings together methods for generating, signing and submitting transaction
   * @param account AptosAccount which will sign a transaction
   * @param payload Transaction payload. It depends on transaction type you want to send
   * @returns Promise that resolves to transaction hash
   */
  async submitTransactionHelper(account: AptosAccount, payload: Gen.TransactionPayload) {
    const txnRequest = await this.aptosClient.generateTransaction(account.address(), payload, {
      max_gas_amount: "4000",
    });
    const signedTxn = await this.aptosClient.signTransaction(account, txnRequest);
    const res = await this.aptosClient.submitTransaction(signedTxn);
    await this.aptosClient.waitForTransaction(res.hash);
    return Promise.resolve(res.hash);
  }

  /**
   * Creates a new NFT collection within the specified account
   * @param account AptosAccount where collection will be created
   * @param name Collection name
   * @param description Collection description
   * @param uri URL to additional info about collection
   * @returns A hash of transaction
   */
  async createCollection(account: AptosAccount, name: string, description: string, uri: string): Promise<string> {
    const payload: Gen.TransactionPayload = {
      type: "script_function_payload",
      function: {
        module: {
          address: "0x3",
          name: "token",
        },
        name: "create_collection_script",
      },
      type_arguments: [],
      arguments: [
        Buffer.from(name).toString("hex"),
        Buffer.from(description).toString("hex"),
        Buffer.from(uri).toString("hex"),
        NUMBER_MAX.toString(),
        [false, false, false],
      ],
    };
    const transactionHash = await this.submitTransactionHelper(account, payload);
    return transactionHash;
  }

  /**
   * Creates a new NFT within the specified account
   * @param account AptosAccount where token will be created
   * @param collectionName Name of collection, that token belongs to
   * @param name Token name
   * @param description Token description
   * @param supply Token supply
   * @param uri URL to additional info about token
   * @param royalty_payee_address the address to receive the royalty, the address can be a shared account address.
   * @param royalty_points_denominator the denominator for calculating royalty
   * @param royalty_points_numerator the numerator for calculating royalty
   * @param property_keys the property keys for storing on-chain properties
   * @param property_values the property values to be stored on-chain
   * @param property_types the type of property values
   * @returns A hash of transaction
   */
  async createToken(
    account: AptosAccount,
    collectionName: string,
    name: string,
    description: string,
    supply: number,
    uri: string,
    royalty_payee_address: MaybeHexString = account.address(),
    royalty_points_denominator: number = 0,
    royalty_points_numerator: number = 0,
    property_keys: Array<string> = [],
    property_values: Array<string> = [],
    property_types: Array<string> = [],
  ): Promise<Gen.HexEncodedBytes> {
    const payload: Gen.TransactionPayload = {
      type: "script_function_payload",
      function: {
        module: {
          address: "0x3",
          name: "token",
        },
        name: "create_token_script",
      },
      type_arguments: [],
      arguments: [
        Buffer.from(collectionName).toString("hex"),
        Buffer.from(name).toString("hex"),
        Buffer.from(description).toString("hex"),
        supply.toString(),
        NUMBER_MAX.toString(),
        Buffer.from(uri).toString("hex"),
        royalty_payee_address.toString(),
        royalty_points_denominator.toString(),
        royalty_points_numerator.toString(),
        [false, false, false, false, false],
        property_keys.map((key) => Buffer.from(key).toString("hex")),
        property_values.map((val) => Buffer.from(val).toString("hex")),
        property_types.map((typ) => Buffer.from(typ).toString("hex")),
      ],
    };
    const transactionHash = await this.submitTransactionHelper(account, payload);
    return transactionHash;
  }

  /**
   * Transfers specified amount of tokens from account to receiver
   * @param account AptosAccount where token from which tokens will be transfered
   * @param receiver  Hex-encoded 32 byte Aptos account address to which tokens will be transfered
   * @param creator Hex-encoded 32 byte Aptos account address to which created tokens
   * @param collectionName Name of collection where token is stored
   * @param name Token name
   * @param amount Amount of tokens which will be transfered
   * @param property_version the version of token PropertyMap with a default value 0.
   * @returns A hash of transaction
   */
  async offerToken(
    account: AptosAccount,
    receiver: MaybeHexString,
    creator: MaybeHexString,
    collectionName: string,
    name: string,
    amount: number,
    property_version: number = 0,
  ): Promise<string> {
    const payload: Gen.TransactionPayload = {
      type: "script_function_payload",
      function: {
        module: {
          address: "0x3",
          name: "token_transfers",
        },
        name: "offer_script",
      },
      type_arguments: [],
      arguments: [
        receiver,
        creator,
        Buffer.from(collectionName).toString("hex"),
        Buffer.from(name).toString("hex"),
        property_version.toString(),
        amount.toString(),
      ],
    };
    const transactionHash = await this.submitTransactionHelper(account, payload);
    return transactionHash;
  }

  /**
   * Claims a token on specified account
   * @param account AptosAccount which will claim token
   * @param sender Hex-encoded 32 byte Aptos account address which holds a token
   * @param creator Hex-encoded 32 byte Aptos account address which created a token
   * @param collectionName Name of collection where token is stored
   * @param name Token name
   * @param property_version the version of token PropertyMap with a default value 0.
   * @returns A hash of transaction
   */
  async claimToken(
    account: AptosAccount,
    sender: MaybeHexString,
    creator: MaybeHexString,
    collectionName: string,
    name: string,
    property_version: number = 0,
  ): Promise<string> {
    const payload: Gen.TransactionPayload = {
      type: "script_function_payload",
      function: {
        module: {
          address: "0x3",
          name: "token_transfers",
        },
        name: "claim_script",
      },
      type_arguments: [],
      arguments: [
        sender,
        creator,
        Buffer.from(collectionName).toString("hex"),
        Buffer.from(name).toString("hex"),
        property_version.toString(),
      ],
    };
    const transactionHash = await this.submitTransactionHelper(account, payload);
    return transactionHash;
  }

  /**
   * Removes a token from pending claims list
   * @param account AptosAccount which will remove token from pending list
   * @param receiver Hex-encoded 32 byte Aptos account address which had to claim token
   * @param creator Hex-encoded 32 byte Aptos account address which created a token
   * @param collectionName Name of collection where token is strored
   * @param name Token name
   * @param property_version the version of token PropertyMap with a default value 0.
   * @returns A hash of transaction
   */
  async cancelTokenOffer(
    account: AptosAccount,
    receiver: MaybeHexString,
    creator: MaybeHexString,
    collectionName: string,
    name: string,
    property_version: number = 0,
  ): Promise<string> {
    const payload: Gen.TransactionPayload = {
      type: "script_function_payload",
      function: {
        module: {
          address: "0x3",
          name: "token_transfers",
        },
        name: "cancel_offer_script",
      },
      type_arguments: [],
      arguments: [
        receiver,
        creator,
        Buffer.from(collectionName).toString("hex"),
        Buffer.from(name).toString("hex"),
        property_version.toString(),
      ],
    };
    const transactionHash = await this.submitTransactionHelper(account, payload);
    return transactionHash;
  }

  /**
   * Queries collection data
   * @param creator Hex-encoded 32 byte Aptos account address which created a collection
   * @param collectionName Collection name
   * @returns Collection data in below format
   * ```
   *  Collection {
   *    // Describes the collection
   *    description: string,
   *    // Unique name within this creators account for this collection
   *    name: string,
   *    // URL for additional information/media
   *    uri: string,
   *    // Total number of distinct Tokens tracked by the collection
   *    count: number,
   *    // Optional maximum number of tokens allowed within this collections
   *    maximum: number
   *  }
   * ```
   */
  async getCollectionData(creator: MaybeHexString, collectionName: string): Promise<any> {
    const resources = await this.aptosClient.getAccountResources(creator);
    const accountResource: { type: Gen.MoveStructTag; data: any } = resources.find((r) =>
      isEqual(r.type, {
        address: "0x3",
        module: "token",
        name: "Collections",
        generic_type_params: [],
      }),
    )!;
    const { handle }: { handle: string } = accountResource.data.collection_data;
    const getCollectionTableItemRequest: Gen.TableItemRequest = {
      key_type: "0x1::string::String",
      value_type: "0x3::token::CollectionData",
      key: Buffer.from(collectionName).toString("hex"),
    };

    const collectionTable = await this.aptosClient.getTableItem(handle, getCollectionTableItemRequest);
    return collectionTable;
  }

  /**
   * Queries token data from collection
   * @param creator Hex-encoded 32 byte Aptos account address which created a token
   * @param collectionName Name of collection, which holds a token
   * @param tokenName Token name
   * @returns Token data in below format
   * ```
   * TokenData {
   *     // Unique name within this creators account for this Token's collection
   *     collection: string;
   *     // Describes this Token
   *     description: string;
   *     // The name of this Token
   *     name: string;
   *     // Optional maximum number of this type of Token.
   *     maximum: number;
   *     // Total number of this type of Token
   *     supply: number;
   *     /// URL for additional information / media
   *     uri: string;
   *   }
   * ```
   */
  async getTokenData(
    creator: MaybeHexString,
    collectionName: string,
    tokenName: string,
  ): Promise<TokenTypes.TokenData> {
    const collection: { type: Gen.MoveStructTag; data: any } = await this.aptosClient.getAccountResource(creator, {
      address: "0x3",
      module: "token",
      name: "Collections",
      generic_type_params: [],
    });
    const { handle } = collection.data.token_data;
    const tokenDataId = {
      creator,
      collection: Buffer.from(collectionName).toString("hex"),
      name: Buffer.from(tokenName).toString("hex"),
    };

    const getTokenTableItemRequest: Gen.TableItemRequest = {
      key_type: "0x3::token::TokenDataId",
      value_type: "0x3::token::TokenData",
      key: tokenDataId,
    };

    // We know the response will be a struct containing TokenData, hence the
    // implicit cast.
    return this.aptosClient.getTableItem(handle, getTokenTableItemRequest);
  }

  /**
   * Queries token balance for the token creator
   */
  async getTokenBalance(
    creator: MaybeHexString,
    collectionName: string,
    tokenName: string,
    property_version: string = "0",
  ): Promise<TokenTypes.Token> {
    const tokenDataId: TokenTypes.TokenDataId = {
      creator: creator instanceof HexString ? creator.hex() : creator,
      collection: Buffer.from(collectionName).toString("hex"),
      name: Buffer.from(tokenName).toString("hex"),
    };
    return this.getTokenBalanceForAccount(creator, {
      token_data_id: tokenDataId,
      property_version,
    });
  }

  /**
   * TODO: What does this mean? Is it more like getTokenBalanceInAccount?
   * Queries token balance for a token account
   * @param account Hex-encoded 32 byte Aptos account address which created a token
   * @param tokenId token id
   *
   * TODO: Update this:
   * @example
   * ```
   * {
   *   creator: '0x1',
   *   collection: 'Some collection',
   *   name: 'Awesome token'
   * }
   * ```
   * @returns Token object in below format
   * ```
   * Token {
   *   id: TokenId;
   *   value: number;
   * }
   * ```
   */
  async getTokenBalanceForAccount(account: MaybeHexString, tokenId: TokenTypes.TokenId): Promise<TokenTypes.Token> {
    const tokenStore: { type: Gen.MoveStructTag; data: any } = await this.aptosClient.getAccountResource(account, {
      address: "0x3",
      module: "token",
      name: "TokenStore",
      generic_type_params: [],
    });
    const { handle } = tokenStore.data.tokens;

    const getTokenTableItemRequest: Gen.TableItemRequest = {
      key_type: "0x3::token::TokenId",
      value_type: "0x3::token::Token",
      key: tokenId,
    };

    return this.aptosClient.getTableItem(handle, getTokenTableItemRequest);
  }
}
