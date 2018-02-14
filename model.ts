export interface Computer {
    deviceClass?: string;
    osVersion?: string;
    platform?: Platform;
}

export enum Platform { Windows='Windows', Unix='Unix', MacOs='MacOs' }