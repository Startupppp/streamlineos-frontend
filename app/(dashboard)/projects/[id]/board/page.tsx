"use client";

import { useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Types (Mock for now, will replace with DB types)
type Ticket = {
    id: string;
    title: string;
    type: "STORY" | "BUG" | "TASK";
    priority: "HIGH" | "MEDIUM" | "LOW";
    assignee?: { name: string; image?: string };
    key: string; // PROJ-12
};

type Column = {
    id: string;
    title: string;
    tickets: Ticket[];
};

// Mock Data
const initialData: Record<string, Column> = {
    "TODO": {
        id: "TODO",
        title: "To Do",
        tickets: [
            { id: "1", title: "Setup Project Repo", type: "TASK", priority: "HIGH", key: "PROJ-1" },
            { id: "2", title: "Design Database Schema", type: "STORY", priority: "MEDIUM", key: "PROJ-2" },
        ]
    },
    "IN_PROGRESS": {
        id: "IN_PROGRESS",
        title: "In Progress",
        tickets: [
            { id: "3", title: "Implement Auth", type: "STORY", priority: "HIGH", key: "PROJ-3" },
        ]
    },
    "DONE": {
        id: "DONE",
        title: "Done",
        tickets: []
    }
};

export default function BoardPage() {
    const [columns, setColumns] = useState(initialData);

    const onDragEnd = (result: DropResult) => {
        const { source, destination } = result;

        // Dropped outside
        if (!destination) return;

        // Same column, same index
        if (source.droppableId === destination.droppableId && source.index === destination.index) return;

        const sourceCol = columns[source.droppableId];
        const destCol = columns[destination.droppableId];
        
        const sourceTickets = [...sourceCol.tickets];
        const destTickets = source.droppableId === destination.droppableId ? sourceTickets : [...destCol.tickets];

        const [movedTicket] = sourceTickets.splice(source.index, 1);
        destTickets.splice(destination.index, 0, movedTicket);

        setColumns({
            ...columns,
            [source.droppableId]: {
                ...sourceCol,
                tickets: sourceTickets
            },
            [destination.droppableId]: {
                ...destCol,
                tickets: destTickets
            }
        });

        // TODO: Call Server Action to update status/order
    };

    return (
        <div className="h-full flex flex-col">
            <div className="px-6 py-4 flex items-center justify-between border-b bg-background">
                <div className="flex items-center space-x-4">
                    <h1 className="text-xl font-semibold">Board</h1>
                    <div className="flex -space-x-2">
                         {/* Avatars of members */}
                         <div className="h-8 w-8 rounded-full bg-slate-200 border-2 border-background flex items-center justify-center text-xs">A</div>
                         <div className="h-8 w-8 rounded-full bg-slate-300 border-2 border-background flex items-center justify-center text-xs">B</div>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                     <Button variant="outline">Complete Sprint</Button>
                </div>
            </div>

            <div className="flex-1 overflow-x-auto overflow-y-hidden bg-slate-50/50 p-6">
                 <DragDropContext onDragEnd={onDragEnd}>
                     <div className="flex h-full space-x-6">
                         {Object.values(columns).map(column => (
                             <div key={column.id} className="w-80 shrink-0 flex flex-col bg-slate-100/50 rounded-lg max-h-full">
                                 <div className="p-3 text-xs font-semibold uppercase text-muted-foreground flex justify-between">
                                     {column.title}
                                     <span className="bg-slate-200 px-2 rounded-full text-[10px]">{column.tickets.length}</span>
                                 </div>
                                 
                                 <Droppable droppableId={column.id}>
                                     {(provided) => (
                                         <div 
                                            {...provided.droppableProps}
                                            ref={provided.innerRef}
                                            className="p-2 flex-1 overflow-y-auto space-y-2 min-h-[100px]"
                                         >
                                             {column.tickets.map((ticket, index) => (
                                                 <Draggable key={ticket.id} draggableId={ticket.id} index={index}>
                                                     {(provided, snapshot) => (
                                                         <div
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            {...provided.dragHandleProps}
                                                            className={cn(
                                                                "bg-background p-3 rounded shadow-sm border border-border group hover:border-primary/50 transition-colors select-none",
                                                                snapshot.isDragging && "shadow-lg rotate-2"
                                                            )}
                                                            style={provided.draggableProps.style}
                                                         >
                                                             <div className="text-sm font-medium mb-2 group-hover:text-primary">
                                                                 {ticket.title}
                                                             </div>
                                                             <div className="flex items-center justify-between mt-2">
                                                                 <div className="flex items-center space-x-2">
                                                                     {/* Type Icon */}
                                                                     <div className={cn(
                                                                         "h-4 w-4 rounded flex items-center justify-center text-[10px] font-bold text-white",
                                                                         ticket.type === "BUG" ? "bg-red-500" : 
                                                                         ticket.type === "STORY" ? "bg-green-500" : "bg-blue-500"
                                                                     )}>
                                                                         {ticket.type[0]}
                                                                     </div>
                                                                     <span className="text-xs text-muted-foreground">{ticket.key}</span>
                                                                 </div>
                                                                 
                                                                 {/* Priority Arrow */}
                                                                 <div className={cn(
                                                                     "h-2 w-2 rounded-full",
                                                                     ticket.priority === "HIGH" ? "bg-red-500" :
                                                                     ticket.priority === "MEDIUM" ? "bg-orange-400" : "bg-blue-400"
                                                                 )} />
                                                             </div>
                                                         </div>
                                                     )}
                                                 </Draggable>
                                             ))}
                                             {provided.placeholder}
                                             
                                             <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:bg-slate-200/50 h-8 text-sm">
                                                 <Plus className="h-4 w-4 mr-2" />
                                                 Create issue
                                             </Button>
                                         </div>
                                     )}
                                 </Droppable>
                             </div>
                         ))}
                     </div>
                 </DragDropContext>
            </div>
        </div>
    );
}
