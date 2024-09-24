import axios from "axios";
import { BASE_URL } from "../../constants";
import { DeleteAnnotationProps, EditAnnotationProps } from "../../types";


/**
 * Handles editing an annotation.
 * 
 * @param param0 - the annotation to edit and the match ID
 * @returns boolean indicating success or failure
 */
export const editAnnotation = async ({
    annotationToEdit,
    matchId
}: EditAnnotationProps) => {
    try {
        if (!annotationToEdit || !matchId) {
            throw new Error('Invalid annotation or match ID');
        }

        const timeinSecs =
            Number(annotationToEdit.timeTextH) * 3600 +
            Number(annotationToEdit.timeTextM) * 60 +
            Number(annotationToEdit.timeTextS);

        annotationToEdit.annotation.timestamp = timeinSecs;
        annotationToEdit.annotation.playerPos = annotationToEdit.playerPosition;
        annotationToEdit.annotation.opponentPos =
            annotationToEdit.opponentPosition;

        const response = await axios.post(
            `${BASE_URL}/annotate/${matchId}/${annotationToEdit.annotation.id}/edit`,
            annotationToEdit.annotation
        );

        if (response.status !== 200) {
            throw new Error('Failed to edit annotation');
        }

        return response.status === 200;
    } catch (error) {
        console.error('Error editing annotation:', error);
        return false;
    }
};


/**
 * Handles removing an annotation.
 *
 * @param annotationId - the ID of the annotation to remove
 * @param matchId - the ID of the match the annotation belongs to
 * @returns boolean indicating success or failure
 */
export const deleteAnnotation = async ({
    annotationId,
    matchId,
}: DeleteAnnotationProps) => {
    try {
        if (!annotationId || !matchId) {
            throw new Error('Invalid annotation or match ID');
        }

        const response = await axios.post(
            `${BASE_URL}/annotate/${matchId}/${annotationId}/remove`
        );

        if (response.status !== 200) {
            throw new Error('Failed to remove annotation');
        }

        return response.status === 200;
    } catch (error) {
        console.error('Error removing annotation:', error);
        return false;
    }
};


/**
 * Handles removing all annotations from a match.
 * 
 * @param matchId - the ID of the match to remove annotations from
 * @returns boolean indicating success or failure
 */
export const deleteAllAnnotations = async (matchId: string) => {
    try {
        if (!matchId) {
            throw new Error('Invalid match ID');
        }

        const response = await axios.delete(`${BASE_URL}/annotate/${matchId}/annotations/clear`);

        if (response.status !== 200) {
            throw new Error('Failed to remove annotations');
        }

        return response.status === 200;
    } catch (error) {
        console.error('Error clearing annotations:', error);
        return false;
    }
}


/**
 * Handles getting all annotations for a match.
 * 
 * @param matchId - the ID of the match to get annotations for
 * @returns an array of annotations
 */
export const getAnnotations = async (matchId: string) => {
    try {
        const response = await axios.get(`${BASE_URL}/annotate/${matchId}/all`);
        return response.data;
    } catch (error) {
        console.error('Error getting annotations:', error);
        return [];
    }
};