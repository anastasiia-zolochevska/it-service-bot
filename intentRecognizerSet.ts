import { Intent, IntentRecognizer } from 'botbuilder';

export enum RecognizeOrder { parallel, series }

/** Optional settings for an `IntentRecognizerSet`. */
export interface IntentRecognizerSetSettings {
    /** 
     * (Optional) preferred order in which the sets recognizers should be run. The default value 
     * is `RecognizeOrder.parallel`.
     */
    recognizeOrder?: RecognizeOrder;

    /**
     * (Optional) if `true` and the [recognizeOrder](#recognizeorder) is `RecognizeOrder.series`,
     * the execution of recognizers will be short circuited should a recognizer return an intent
     * with a score of 1.0.  The default value is `true`.
     */
    stopOnExactMatch?: boolean;
}

interface RecognizerConfig {
    recognizer: IntentRecognizer,
    threshold: number
}

export class IntentRecognizerSet extends IntentRecognizer {
    private settings: IntentRecognizerSetSettings;
    private recognizers: RecognizerConfig[] = [];

    /**
     * Creates a new instance of a recognizer set.
     *
     * @param settings (Optional) settings to customize the sets execution strategy.
     */
    constructor(settings?: IntentRecognizerSetSettings) {
        super();
        this.settings = Object.assign(<IntentRecognizerSetSettings>{
            recognizeOrder: RecognizeOrder.parallel,
            stopOnExactMatch: true
        }, settings);
        this.onRecognize((context) => {
            if (this.settings.recognizeOrder === RecognizeOrder.parallel) {
                return this.recognizeInParallel(context);
            } else {
                return this.recognizeInSeries(context);
            }
        });
    }

    /**
     * Adds recognizer(s) to the set. Recognizers will be evaluated in the order they're
     * added to the set.
     *
     * @param recognizers One or more recognizers to add to the set.
     */
    public add(recognizer: IntentRecognizer, threshold: number): this {
        this.recognizers.push({
            recognizer: recognizer,
            threshold: threshold
        });
        // Array.prototype.push.apply(this.recognizers, recognizer);
        return this;
    }

    private recognizeInParallel(context: BotContext): Promise<Intent[]> {
        // Call recognize on all children
        const promises: Promise<Intent[]>[] = [];
        this.recognizers.forEach((r) => promises.push(r.recognizer.recognize(context)));

        // Wait for all of the promises to resolve
        return Promise.all(promises).then((results) => {
            // Merge intents
            let intents: Intent[] = [];
            results.forEach((r) => intents = intents.concat(r));
            return intents;
        });
    }

    private recognizeInSeries(context: BotContext): Promise<Intent[]> {
        return new Promise<Intent[]>((resolve, reject) => {
            let intents: Intent[] = [];
            const that = this;
            function next(i: number) {
                if (i < that.recognizers.length) {
                    that.recognizers[i].recognizer.recognize(context)
                        .then((r) => {
                            intents = intents.concat(r);
                            if (that.settings.stopOnExactMatch && that.meetsThreshold(r, that.recognizers[i].threshold)) {
                                resolve(intents);
                            } else {
                                next(i + 1);
                            }
                        })
                        .catch((err) => reject(err))
                } else {
                    resolve(intents);
                }
            }
            next(0);
        });
    }

    // private hasExactMatch(intents: Intent[]): boolean {
    //     intents.forEach((intent) => {
    //         if (intent.score >= 1.0) {
    //             return true;
    //         }
    //     });
    //     return false;
    // }

    private meetsThreshold(intents: Intent[], threshold: number): boolean {
        return intents.some(intent => intent.score >= threshold);
    }
}