"use client";

import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PlusCircle, Users, LogIn, LogOut } from 'lucide-react'
import { useEffect, useState } from "react";
import { Call, StreamCall, StreamTheme, StreamVideo, SpeakerLayout, StreamVideoClient } from "@stream-io/video-react-sdk";
import "@stream-io/video-react-sdk/dist/css/styles.css";
import { useUser } from "@clerk/clerk-react";
import { collection, getDocs, query, addDoc, doc, getDoc, updateDoc, deleteDoc, onSnapshot } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import CustomCallControls from "./CallControls";
import { Baloo_Bhai_2 } from 'next/font/google';
import ShowSpeakingQuestions from "./SpeakingQuestionDisplay";
import Image from "next/image";
import FakeRoomCards from "./FakeRoomCards";
import ReportIssueModal from "./ReportIssueModal";

const Baloo = Baloo_Bhai_2({ subsets: ['latin'], weight: ['400', '500', '700'] });

const apiKey = "mmhfdzb5evj2";

const tokenProvider = async (userId: string) => {
    const { token } = await fetch(
        "https://pronto.getstream.io/api/auth/create-token?" +
        new URLSearchParams({
            api_key: apiKey,
            user_id: userId,
        })
    ).then((res) => res.json());
    return token as string;
};

type Room = {
    id: string;
    isFull: boolean;
    participants: {
        name: string;
        userId: string;
        lastActive: number;
    }[];
};

export default function VideoConferencingRoom() {
    const [client, setClient] = useState<StreamVideoClient>();
    const [call, setCall] = useState<Call>();
    const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
    const { user } = useUser();
    const [randomModuleSetFromFirebase, setRandomModuleSetFromFirebase] = useState<number[] | null>(null); // Add state for randomModuleSet
    const [HowManyPeopleInRoom, setHowManyPeopleInRoom] = useState(0);
    const [SDKparticipantCount, setSDKParticipantCount] = useState(0);
    const [IsReportIssueModalOpen, setIsReportIssueModalOpen] = useState(false);
    const [IsReportIssuetriggeredByMismatch, setIsReportIssuetriggeredByMismatch] = useState(false);

    // Initialize Stream Video Client
    useEffect(() => {
        if (!user) return;

        const myClient = new StreamVideoClient({
            apiKey,
            user: { id: user.id },
            tokenProvider: () => tokenProvider(user.id),
        });

        setClient(myClient);

        return () => {
            myClient.disconnectUser();
            setClient(undefined);
        };
    }, [user]);

    // Join call
    useEffect(() => {
        if (!client || !selectedCallId) return;

        const myCall = client.call("default", selectedCallId);
        myCall
            .join({ create: true })
            .catch((err) => console.error("Failed to join the call:", err));

        setCall(myCall);

        const updateParticipantCount = () => {
            const participants = myCall.state.participants || [];
            setSDKParticipantCount(participants.length);
        };

        // Attach listeners for participant events
        myCall.on("participantJoined", updateParticipantCount);
        myCall.on("participantLeft", updateParticipantCount);

        updateParticipantCount();

        return () => {

            myCall.off("participantJoined", updateParticipantCount);
            myCall.off("participantLeft", updateParticipantCount);

            myCall
                .leave()
                .catch((err) => console.error("Failed to leave the call:", err));
            setCall(undefined);
        };
    }, [client, selectedCallId]);

    useEffect(() => {
        const fetchRandomModuleSet = async () => {
            if (!selectedCallId) return;

            try {
                const roomRef = doc(db, "rooms", selectedCallId);
                const roomSnapshot = await getDoc(roomRef);

                if (roomSnapshot.exists()) {
                    const roomData = roomSnapshot.data();
                    setRandomModuleSetFromFirebase(roomData.randomModuleSet || []);
                }
            } catch (error) {
                console.error("Error fetching randomModuleSet:", error);
            }
        };

        fetchRandomModuleSet();
    }, [selectedCallId]);

    useEffect(() => {
        if (user) {
            const handleBeforeUnload = (event: BeforeUnloadEvent) => {
                event.preventDefault(); // Trigger browser confirmation dialog
                event.returnValue = ""; // Necessary for dialog to work

                const payload = {
                    roomId: selectedCallId,
                    userId: user?.id,
                };

                // Using fetch to call the API
                fetch("/api/removeParticipant", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(payload),
                })
                    .then((res) => res.json())
                    .then((data) => console.log("API Response:", data))
                    .catch((err) => console.error("Error in API call:", err));
            };

            window.addEventListener("beforeunload", handleBeforeUnload);

            return () => {
                window.removeEventListener("beforeunload", handleBeforeUnload);
            };
        }
    }, [selectedCallId]);

    const removeParticipantFromRoom = async (roomId: string) => {
        if (selectedCallId) {
            try {
                const roomRef = doc(db, "rooms", roomId);
                const roomSnapshot = await getDoc(roomRef);

                if (roomSnapshot.exists()) {
                    const roomData = roomSnapshot.data();

                    const updatedParticipants = (roomData.participants || []).filter(
                        (participant: any) => participant.userId !== user?.id
                    );

                    await updateDoc(roomRef, { participants: updatedParticipants });

                    console.log(`Participant removed from room ${roomId}`);
                    sessionStorage.setItem("inroom", "false");

                    setCall(undefined);
                    setSelectedCallId(null);
                }
            } catch (error) {
                console.error("Error removing participant:", error);
            }
        }
    };

    useEffect(() => {
        if (!selectedCallId) return;

        const roomRef = doc(db, "rooms", selectedCallId);

        const unsubscribe = onSnapshot(roomRef, (docSnapshot) => {
            if (docSnapshot.exists()) {
                const roomData = docSnapshot.data();
                const participants = roomData.participants || [];
                setHowManyPeopleInRoom(participants.length);
            } else {
                console.error(`Room with ID ${selectedCallId} does not exist.`);
            }
        });

        return () => unsubscribe();
    }, [selectedCallId]);

    const deleteRoom = async (roomId: string) => {
        if (roomId && HowManyPeopleInRoom >= 2 && (SDKparticipantCount == 1 || SDKparticipantCount == 0)) {
            try {
                const roomRef = doc(db, "rooms", roomId);
                const roomSnapshot = await getDoc(roomRef);

                if (roomSnapshot.exists()) {
                    await deleteDoc(roomRef); // Delete the room document from Firestore
                    console.log(`Room with ID ${roomId} has been deleted.`);

                    // Optional: Reset related states if the current room is deleted
                    if (selectedCallId === roomId) {
                        setCall(undefined);
                        setSelectedCallId(null);
                    }
                } else {
                    console.error(`Room with ID ${roomId} does not exist.`);
                }
            } catch (error) {
                console.error("Error deleting room:", error);
            }
        } else {
            alert("less participants in room")
        }
    };

    useEffect(() => {
        if (HowManyPeopleInRoom >= 2 && SDKparticipantCount === 1) {
            const timeoutId = setTimeout(() => {
                // Recheck the variables after 5 seconds
                if (HowManyPeopleInRoom >= 2 && SDKparticipantCount === 1) {
                    setIsReportIssuetriggeredByMismatch(true); // Open modal programmatically
                    setIsReportIssueModalOpen(true);
                    console.log("Mismatch confirmed:", HowManyPeopleInRoom, SDKparticipantCount);
                } else {
                    console.log("Mismatch resolved. No need to trigger the modal.");
                }
            }, 5000); // 5 seconds

            // Cleanup timeout to avoid memory leaks
            return () => clearTimeout(timeoutId);
        }
    }, [HowManyPeopleInRoom, SDKparticipantCount]);


    return (
        <div className="mb-5">
            {call && selectedCallId && (
                <div className="min-h-screen bg-white shadow-2xl rounded-lg p-10 gap-10 flex-col md:flex-row flex bg-cover bg-center" style={{ backgroundImage: `url(/lib-bg.jpg)`, }}>
                    <div className="md:w-[50%] order-2 sm:order-1">
                        <StreamVideo client={client!}>
                            <StreamTheme className="text-white my-theme-overrides">
                                <StreamCall call={call}>
                                    <SpeakerLayout pageArrowsVisible={false} />
                                    <CustomCallControls removeParticipant={removeParticipantFromRoom} roomId={selectedCallId} />
                                </StreamCall>
                            </StreamTheme>
                        </StreamVideo>
                    </div>
                    <div className={`${Baloo.className} flex items-center justify-center flex-col md:w-[50%] roudned-lg order-1 sm:order-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl`}>
                        <div className="flex p-4 sm:p-0 md:gap-3">
                            {/* <div>{SDKparticipantCount}</div> */}
                            <div className="text-white font-extrabold md:text-3xl">Total Students in Room : {HowManyPeopleInRoom}</div>
                            <Button
                                onClick={() => { setIsReportIssueModalOpen(true); setIsReportIssuetriggeredByMismatch(false) }}
                                variant="destructive"
                                className="font-semibold"
                            >
                                Report Issue
                            </Button>
                            <ReportIssueModal
                                removeParticipantFromRoom={removeParticipantFromRoom}
                                deleteRoom={deleteRoom}
                                selectedCallId={selectedCallId}
                                isModalOpen={IsReportIssueModalOpen}
                                setIsModalOpen={setIsReportIssueModalOpen}
                                triggeredByMismatch={IsReportIssuetriggeredByMismatch}
                            />
                        </div>
                        <ShowSpeakingQuestions randomModuleSetFromFirebase={randomModuleSetFromFirebase} />
                    </div>
                </div>
            )}
            {!call && (
                <RoomList setCallId={setSelectedCallId} removeParticipantFromRoom={removeParticipantFromRoom} HowManyPeopleInRoom={setHowManyPeopleInRoom} />
            )}
        </div>
    );
}

function RoomList({
    setCallId,
    removeParticipantFromRoom,
    HowManyPeopleInRoom
}: {
    setCallId: (callId: string) => void;
    removeParticipantFromRoom: (roomId: string) => void;
    HowManyPeopleInRoom: (callId: number) => void;
}) {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(false);
    const { user } = useUser();
    const [isCreateRoomCooldown, setIsCreateRoomCooldown] = useState(false); // Cooldown state
    const [CreateRoomcooldownTimer, setCreateRoomCooldownTimer] = useState(0); // Timer for display

    const fetchRooms = async () => {
        try {
            const roomsQuery = query(collection(db, "rooms"));
            const querySnapshot = await getDocs(roomsQuery);

            // Map Firestore data to the Room type
            const fetchedRooms = querySnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Room[];

            setRooms(fetchedRooms);
        } catch (error) {
            console.error("Error fetching rooms:", error);
        }
    };

    const startCreateRoomCoolDownTimer = () => {
        const timerInterval = setInterval(() => {
            setCreateRoomCooldownTimer((prev) => {
                if (prev <= 1) {
                    clearInterval(timerInterval); // Stop the interval when the timer reaches 0
                    setIsCreateRoomCooldown(false); // Reset the cooldown state
                    return 0; // Reset the timer
                }
                return prev - 1; // Decrement the timer
            });
        }, 60 * 1000); // Run every minute
    };

    const createRoom = async () => {
        if (isCreateRoomCooldown) {
            alert(`Please wait for ${CreateRoomcooldownTimer} minute(s) before creating another room.`);
            return;
        } else {
            try {
                setLoading(true);

                const range = Array.from({ length: 20 }, (_, i) => i + 1); // [1, 2, ..., 20]
                const shuffled = range.sort(() => Math.random() - 0.5); // Shuffle the array
                const randomModuleSet = shuffled.slice(0, 20); // Take the first 20 elements

                const newRoom = {
                    isFull: false,
                    participants: [],
                    randomModuleSet
                };

                const docRef = await addDoc(collection(db, "rooms"), newRoom);
                console.log("Room created with ID:", docRef.id);

                await fetchRooms();

                setIsCreateRoomCooldown(true);
                setCreateRoomCooldownTimer(3);
                startCreateRoomCoolDownTimer()

            } catch (error) {
                console.error("Error creating room:", error);
            } finally {
                setLoading(false);
            }
        }
    };

    const addParticipantToRoom = async (roomId: string) => {
        if (!user) {
            window.location.href = "https://accounts.ieltsgoglobal.com/sign-in?redirect_url=https%3A%2F%2Fwww.ieltsgoglobal.com%2Fspeaking-partner"
        } else {
            try {
                const roomRef = doc(db, "rooms", roomId);
                const roomSnapshot = await getDoc(roomRef);

                if (roomSnapshot.exists()) {
                    const roomData = roomSnapshot.data();

                    if ((roomData.participants || []).length >= 2) {
                        alert("This room is already full. Please join another room or create a new one.");
                        return;
                    }

                    // Add the current user as a participant
                    const updatedParticipants = [
                        ...(roomData.participants || []),
                        {
                            name: user?.fullName || "Anonymous",
                            userId: user?.id,
                            lastActive: Date.now(),
                        },
                    ];

                    await updateDoc(roomRef, {
                        participants: updatedParticipants,
                    });

                    console.log(`Participant added to room ${roomId} successfully!`);

                    sessionStorage.setItem("inroom", "true");
                    // Optionally refresh the room list
                    fetchRooms();

                    // Set the selected call ID
                    setCallId(roomId);
                } else {
                    console.error("Room does not exist.");
                }
            } catch (error) {
                console.error("Error adding participant to the room:", error);
            }
        }
    };

    useEffect(() => {
        fetchRooms();
    }, []);

    return (
        <div className={`${Baloo.className} bg-gradient-to-b from-yellow-300 to-yellow-100 rounded-lg container mx-auto px-4 py-8`}>
            <h1 className={`${Baloo.className} text-3xl font-extrabold text-center mb-8`}>IELTS Speaking Partner</h1>
            <div className="flex flex-col sm:flex-row items-center justify-center mb-8 gap-5">
                <Button
                    onClick={createRoom}
                    disabled={loading}
                    size="lg"
                    className={`${Baloo.className} bg-black font-bold`}
                >
                    {loading ? (
                        <>Creating Room...</>
                    ) : (
                        <>
                            {isCreateRoomCooldown ? `Wait ${CreateRoomcooldownTimer} min(s)` : <>{<PlusCircle className="mr-2 h-4 w-4" />} Create New Room</>}
                        </>
                    )}
                </Button>
                <Button
                    onClick={fetchRooms}
                    size="lg"
                    variant="outline"
                    className={`${Baloo.className} font-bold`}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="2"
                        stroke="currentColor"
                        className="mr-2 h-4 w-4"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m-.582 0a7 7 0 0113.657 2M20 20v-5h-.581m.581 0a7 7 0 01-13.657-2" />
                    </svg>
                    Reload Rooms
                </Button>
                <Button
                    onClick={() => { window.location.href = "https://chat.whatsapp.com/FCXJLuhaUGC25JhFBFCkAR" }}
                    size="lg"
                    variant="outline"
                    className={`${Baloo.className} font-bold`}
                >
                    <Image src="/navbar/whatsapp.png" alt="→" width={20} height={20} />
                    Join Student Community
                </Button>
            </div>
            {rooms.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {rooms.sort((a, b) => {
                        return a.participants.length - b.participants.length;
                    }).map((room, index) => (
                        <Card key={room.id} className="w-full">
                            <CardHeader>
                                <CardTitle className="flex justify-between items-center">
                                    Room {rooms.length + 3 - index}
                                    <Badge variant={(room.participants.length >= 2) ? "destructive" : "secondary"}>
                                        {(room.participants.length >= 2) ? "Full" : "Available"}
                                    </Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center mb-2">
                                    <Users className="mr-2 h-4 w-4" />
                                    <span>
                                        {room.participants.length} / 2 Participants
                                    </span>
                                </div>
                                <div>
                                    {/* {room.participants.map((p, index) => (
                                        <Badge key={index} variant="outline" className="mr-2">
                                            {p.name}
                                        </Badge>
                                    ))} */}
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-between gap-2">
                                <Button
                                    onClick={() => { setCallId(room.id); addParticipantToRoom(room.id); HowManyPeopleInRoom(room.participants.length + 1) }}
                                    disabled={room.participants.length >= 2}
                                    variant="outline"
                                    className={"bg-green-600 font-bold text-white hover:bg-green-500 hover:text-white"}
                                >
                                    <LogIn className="mr-2 h-4 w-4" /> Join Room
                                </Button>
                                <Button
                                    onClick={() => { setCallId(''); removeParticipantFromRoom(room.id) }}
                                    // disabled={room.isFull}
                                    disabled={true}
                                    variant={!room.isFull ? "outline" : "destructive"}
                                >
                                    <LogOut className="mr-2 h-4 w-4" /> Exit Room
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                    <FakeRoomCards />
                </div>
            ) : (
                <p className="text-center text-gray-500">No available rooms found.</p>
            )}
        </div>
    );
}
