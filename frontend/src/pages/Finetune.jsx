import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import api from '../utils/api';

const Finetune = () => {
    const [file, setFile] = useState(null);
    const [fileId, setFileId] = useState(null);
    const [jobId, setJobId] = useState(null);
    const [status, setStatus] = useState(null);
    const { toast } = useToast();

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const uploadFile = async () => {
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await api.post('/api/v1/finetune/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            setFileId(response.data.fileId);
            toast({
                title: "Success",
                description: "File uploaded successfully"
            });
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.response?.data?.message || "Failed to upload file"
            });
        }
    };

    const startFineTuning = async () => {
        try {
            const response = await api.post('/api/v1/finetune/create', {
                fileId,
                model: "gpt-3.5-turbo"
            });

            setJobId(response.data.jobId);
            toast({
                title: "Success",
                description: "Fine-tuning job started"
            });
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.response?.data?.message || "Failed to start fine-tuning"
            });
        }
    };

    const checkStatus = async () => {
        try {
            const response = await api.get(`/api/v1/finetune/status/${jobId}`);
            setStatus(response.data);
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to get status"
            });
        }
    };

    return (
        <div className="container max-w-2xl mx-auto p-4">
            <Card className="p-6 space-y-4">
                <h2 className="text-2xl font-bold">Fine-tune Model</h2>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Upload Training File (.jsonl)
                        </label>
                        <input
                            type="file"
                            accept=".jsonl"
                            onChange={handleFileChange}
                            className="block w-full text-sm text-gray-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-md file:border-0
                                file:text-sm file:font-semibold
                                file:bg-primary file:text-primary-foreground
                                hover:file:bg-primary/90"
                        />
                    </div>

                    <Button 
                        onClick={uploadFile} 
                        disabled={!file}
                        className="w-full"
                    >
                        Upload File
                    </Button>

                    {fileId && (
                        <Button 
                            onClick={startFineTuning}
                            className="w-full"
                        >
                            Start Fine-tuning
                        </Button>
                    )}

                    {jobId && (
                        <div className="space-y-2">
                            <Button 
                                onClick={checkStatus}
                                variant="outline"
                                className="w-full"
                            >
                                Check Status
                            </Button>

                            {status && (
                                <div className="p-4 bg-muted rounded-md">
                                    <p>Status: {status.status}</p>
                                    {status.fine_tuned_model && (
                                        <p>Model ID: {status.fine_tuned_model}</p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default Finetune; 