"use client"

import React from "react"
import { format } from "date-fns"
import { CalendarDays } from "lucide-react"
import { cn } from "lib/utils"
import { Button } from "@components/ui/button"
import { Calendar } from "@components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@components/ui/popover"
import { DateRange } from "react-day-picker"
import { SetterOrUpdater } from "recoil"
import moment from "moment"

interface ITaskDatePickerWithRange {
    className?: React.HTMLAttributes<HTMLDivElement>,
    date?: DateRange;
    onSelect?: SetterOrUpdater<DateRange | undefined>;
    label?: string,
    data?: any,
}
export function TaskDatePickerWithRange({
    className,
    date,
    onSelect,
    label,
    data,
}: ITaskDatePickerWithRange) {
    const isDateDisabled = (dateToCheck: any) => {
        const { from, to }: any = data;
        const fromDate = new Date(moment(from)?.format('YYYY-MM-DD'));
        const toDate = new Date(moment(to)?.format('YYYY-MM-DD'));
        return dateToCheck < fromDate || dateToCheck > toDate;
    };

    return (
        <div className={cn("grid gap-2", className)}>
            <Popover>
                <PopoverTrigger asChild >
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                            "w-[230px] justify-start text-left font-normal dark:bg-dark--theme-light rounded-xl  mt-4 mb-2 lg:mt-0 h-9",
                            !date && "text-muted-foreground"
                        )}
                    >
                        <CalendarDays className="mr-2 h-4 w-4" />
                        {date?.from ? (
                            date.to ? (
                                <>
                                    {format(date.from, "dd.MM.yyyy")} -{" "}
                                    {format(date.to, "dd.MM.yyyy")}
                                </>
                            ) : (
                                format(date.from, "dd.MM.yyyy")
                            )
                        ) : (
                            <span>{label}</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="center">
                    <Calendar
                        className="dark:bg-dark--theme"
                        initialFocus
                        mode={'range'}
                        defaultMonth={date?.from}
                        selected={date}
                        onSelect={onSelect}
                        numberOfMonths={2}
                        disabled={isDateDisabled}
                    />
                </PopoverContent>
            </Popover>
        </div>
    )
}
