import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

export type Student = {
    id: string
    firstName: string
    email: string
    degree: string
    studyYear?: string
    course?: string
    selectedDate?: string
    selectedTime?: string
    stage: string
    countryCode?: string
    mobile?: string
    studyPlan?: string
}

interface StudentTableProps {
    students: Student[]
}

export function StudentTable({ students }: StudentTableProps) {
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)

    const generateWhatsAppLink = (student: Student) => {
        const phoneNumber = `${student.countryCode || ""}${student.mobile || ""}`
        const message = encodeURIComponent(
            `Hello ${student.firstName},\n\n` +
            `Here are your details:\n` +
            `- Email: ${student.email}\n` +
            `- Degree: ${student.degree}\n` +
            `- Year: ${student.studyYear || "-"}\n` +
            `- Course: ${student.course || "-"}\n` +
            `- Meeting Date: ${student.selectedDate
                ? new Date(student.selectedDate).toLocaleDateString()
                : "Not Scheduled"
            }\n` +
            `- Meeting Time: ${student.selectedTime || "-"}\n` +
            `- Stage: ${student.stage}\n\n` +
            `Let us know if you need further assistance!`
        )
        return `https://wa.me/${phoneNumber}?text=${message}`
    }

    const handleWhatsAppMessage = (student: Student) => {
        const link = generateWhatsAppLink(student)
        window.open(link, "_blank")
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Degree</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Meeting Date</TableHead>
                    <TableHead>Meeting Time</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {students.map((student) => (
                    <TableRow key={student.id}>
                        <TableCell>{student.firstName}</TableCell>
                        <TableCell>{student.email}</TableCell>
                        <TableCell>{student.degree}</TableCell>
                        <TableCell>{student.studyYear || "-"}</TableCell>
                        <TableCell>{student.course || "-"}</TableCell>
                        <TableCell>{student.selectedDate ? new Date(student.selectedDate).toLocaleDateString() : "Not Scheduled"}</TableCell>
                        <TableCell>{student.selectedTime || "-"}</TableCell>
                        <TableCell>{student.stage}</TableCell>
                        <TableCell>
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setSelectedStudent(student)}
                                    >
                                        View Details
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="">
                                    <DialogHeader>
                                        <DialogTitle>Student Details</DialogTitle>
                                    </DialogHeader>
                                    {selectedStudent && (
                                        <div className="space-y-4">
                                            <p>
                                                <strong>Name:</strong> {selectedStudent.firstName}
                                            </p>
                                            <p>
                                                <strong>Email:</strong> {selectedStudent.email}
                                            </p>
                                            <p>
                                                <strong>Degree:</strong> {selectedStudent.degree}
                                            </p>
                                            <p>
                                                <strong>Year:</strong> {selectedStudent.studyYear || "-"}
                                            </p>
                                            <p>
                                                <strong>Course:</strong> {selectedStudent.course || "-"}
                                            </p>
                                            <p>
                                                <strong>Meeting Date:</strong>{" "}
                                                {selectedStudent.selectedDate
                                                    ? new Date(selectedStudent.selectedDate).toLocaleDateString()
                                                    : "Not Scheduled"}
                                            </p>
                                            <p>
                                                <strong>Meeting Time:</strong> {selectedStudent.selectedTime || "-"}
                                            </p>
                                            <p>
                                                <strong>Stage:</strong> {selectedStudent.stage}
                                            </p>
                                            <p>
                                                <strong>Country Code:</strong> {selectedStudent.countryCode || "-"}
                                            </p>
                                            <p>
                                                <strong>Mobile:</strong> {selectedStudent.mobile || "-"}
                                            </p>
                                            <p>
                                                <strong>Study Plan:</strong> {selectedStudent.studyPlan || "-"}
                                            </p>
                                            <p>
                                                <Button onClick={() => handleWhatsAppMessage(selectedStudent)}>Message on Whatsapp</Button>
                                            </p>
                                        </div>
                                    )}
                                </DialogContent>
                            </Dialog>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}