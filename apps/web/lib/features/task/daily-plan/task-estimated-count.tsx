import { secondsToTime } from '@app/helpers';
import { IDailyPlan } from '@app/interfaces';
import { VerticalSeparator } from 'lib/components';
import { useTranslations } from 'next-intl';

interface ITaskEstimatedCount {
	outstandingPlans: any[];
}
export function TaskEstimatedCount({ outstandingPlans }: ITaskEstimatedCount) {
	const element = outstandingPlans?.map((plan: IDailyPlan) => plan.tasks?.map((task) => task));
	const { timesEstimated, totalTasks } = estimatedTotalTime(element || []);
	const { h: hour, m: minute } = secondsToTime(timesEstimated || 0);
	const t = useTranslations()

	return (
		<div className="flex space-x-10">
			<div className="flex space-x-2">
				<span className="text-slate-600 dark:text-slate-200">{t('dailyPlan.ESTIMATED')} :</span>
				<span className="text-slate-900 dark:text-slate-200 font-semibold text-[12px]">
					{hour}h{minute}m
				</span>
			</div>
			<VerticalSeparator className="border-slate-400" />
			<div className="flex space-x-2">
				<span className="text-slate-600 dark:text-slate-200">{t('dailyPlan.TOTAL_TASK')}:</span>
				<span className="text-slate-900 dark:text-slate-200 font-semibold text-[12px]">{totalTasks}</span>
			</div>
		</div>
	);
}

export function estimatedTotalTime(data: any) {
	// Flatten the data and reduce to calculate the sum of estimates without duplicates
	const uniqueTasks = data.flat().reduce((acc: any, task: any) => {
		if (!acc[task.id]) {
			acc[task.id] = task.estimate;
		}
		return acc;
	}, {});

	// Calculate the total of estimates
	const timesEstimated = Object.values(uniqueTasks)?.reduce((total: number, estimate: any) => total + estimate, 0);
	// Calculate the total of tasks
	const totalTasks = Object.values(uniqueTasks)?.length;

	return { timesEstimated, totalTasks };
}

export const getTotalTasks = (plan: IDailyPlan[]) => {
	if (!plan) {
		return 0;
	}
	const tasksPerPlan = plan.map((plan) => plan.tasks?.length);

	if (tasksPerPlan.length <= 0) {
		return 0;
	}

	return tasksPerPlan.reduce((a, b) => (a ?? 0) + (b ?? 0)) ?? 0;
};
