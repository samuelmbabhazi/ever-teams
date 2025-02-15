import { ChildProcessFactory, Observer } from '../utils';
import { BrowserWindow } from 'electron';
import { ServerConfig } from './server-config';
import EventEmitter from 'events';
import { EventLists, LOG_TYPES } from '../../constant';
// import { Timeout } from '../../decorators';

export abstract class ServerTask {
	private processPath: string;
	protected args: Record<string, any>;
	protected window: BrowserWindow;
	protected successMessage: string;
	private errorMessage: string;
	protected config: ServerConfig;
	protected loggerObserver: Observer<string, void>;
	private stateObserver: Observer<boolean, void>;
	public restartObserver: Observer<{ type?: string; status?: string }, void>;
	protected pid: string;
	protected isRunning: boolean;
	protected signal: AbortSignal;
	private criticalMessageError = ['[CRITICAL::ERROR]', 'EADDRINUSE'];
	public eventEmmitter: EventEmitter;

	protected constructor(
		processPath: string,
		args: Record<string, any>,
		serverWindow: BrowserWindow,
		successMessage: string,
		errorMessage: string,
		signal: AbortSignal,
		eventEmmitter: EventEmitter
	) {
		this.processPath = processPath;
		this.args = args;
		this.window = serverWindow;
		this.successMessage = successMessage;
		this.errorMessage = errorMessage;
		this.config = new ServerConfig();
		this.pid = `${this.args.serviceName}Pid`;
		this.signal = signal;
		this.isRunning = false;
		this.eventEmmitter = eventEmmitter;

		this.loggerObserver = new Observer((msg: string) => {
			console.log('Sending log_state:', msg);
			if (!this.window?.isDestroyed()) {
				// this.window.webContents.send('log_state', { msg });
			}
		});

		this.stateObserver = new Observer((state: boolean) => {
			this.isRunning = state;
			if (!this.window?.isDestroyed()) {
				console.log('Sending running_state:', state);
				// this.window.webContents.send('running_state', state);
			}
		});

		this.restartObserver = new Observer((options?) => {
			if (!this.window?.isDestroyed()) {
				console.log('Sending resp_msg:', options);
				// this.window.webContents.send('resp_msg', { type: 'start_server', status: 'success', ...options });
			}
		});
	}

	protected async runTask(signal: AbortSignal): Promise<void> {
		console.log('Run Server Task');
		return new Promise<void>((resolve, reject) => {
			try {
				console.log('creating process with processPath:', this.processPath, 'args:', JSON.stringify(this.args));

				const service = ChildProcessFactory.createProcess(this.processPath, this.args, signal);

				console.log(LOG_TYPES.SERVER_LOG, 'Service created', service.pid);

				service.stdout?.on('data', (data: any) => {
					const msg = data.toString();
					this.loggerObserver.notify(msg);
					if (msg.includes(this.successMessage)) {
						const name = String(this.args.serviceName);
						this.stateObserver.notify(true);
						this.loggerObserver.notify(
							`☣︎ ${name.toUpperCase()} server listen to ${this.config.setting[`${name}Url`]}`
						);
						resolve();
					}

					if (this.criticalMessageError.some((error) => msg.includes(error))) {
						this.handleError(msg);
						reject(msg);
					}
				});

				service.stderr?.on('data', (data: any) => {
					console.log(LOG_TYPES.SERVER_LOG, 'stderr:', data.toString());
					this.loggerObserver.notify(data.toString());
				});

				service.on('disconnect', () => {
					console.log(LOG_TYPES.SERVER_LOG, 'Webserver disconnected');
					if (this.eventEmmitter) {
						this.eventEmmitter.emit(EventLists.webServerStopped);
					}
				})

				service.on('error', (err) => {
					console.log('child process error', err);
				})

				if (this.eventEmmitter) {
					this.eventEmmitter.emit(EventLists.webServerStarted);
				}
				this.config.setting = { server: { ...this.config.setting.server, [this.pid]: service.pid } };
			} catch (error) {
				console.error('Error running task:', error);
				this.handleError(error);
				reject(error);
			}
		});
	}

	public kill(callHandleError = true): void {
		console.log('Kill Server Task');
		try {
			if (this.pid && this.config.setting.server[this.pid]) {
				process.kill(this.config.setting.server[this.pid]);
				delete this.config.setting.server[this.pid];
				this.stateObserver.notify(false);
				this.loggerObserver.notify(`[${this.pid.toUpperCase()}-${this.config.setting.server[this.pid]}]: stopped`);
			}
		} catch (error: any) {
			if (callHandleError) {
				if (error.code === 'ESRCH') {
					error.message = `ERROR: Could not terminate the process [${this.pid}]. It was not running: ${error}`;
				}
				this.handleError(error, false); // Pass false to prevent retrying kill in handleError
			}
		}
	}

	public get running(): boolean {
		return this.isRunning && !!this.config.setting.server[this.pid];
	}

	public async restart(): Promise<void> {
		console.log('Restart Server Task');

		if (this.running) {
			this.stop();
		}

		await this.start();
	}

	public stop(): void {
		console.log('Stop Server Task');
		this.kill();
	}

	public async start(): Promise<void> {
		console.log('Start Server Task');
		try {
			await this.runTask(this.signal);
		} catch (error) {
			console.error('Error starting task:', error);
			this.handleError(error);
		}
	}

	protected handleError(error: any, attemptKill = true) {
		if (attemptKill) {
			this.kill(false); // Pass false to indicate that handleError should not attempt to kill again
		}
		this.stateObserver.notify(false);
		console.error(this.errorMessage, error);
		this.loggerObserver.notify(`ERROR: ${this.errorMessage} ${error}`);
	}
}
